import json

from fastapi import APIRouter, Depends, HTTPException, status
from google import genai
from google.genai import types
from google.genai import errors as genai_errors
from sqlalchemy.orm import Session

from ..config import settings
from ..database import get_db
from ..deps import get_current_user_optional
from ..models import Report, User
from ..schemas import ReportOut, ReportRequest

router = APIRouter(prefix="/reports", tags=["reports"])

SYSTEM_PROMPT = """You are a wellness assistant generating a BASIC, general-information \
health/lifestyle summary from a user's self-reported symptoms and a day of food/sleep logging.

Rules:
- This is NOT a diagnosis and NOT medical advice. Never name a specific medical condition \
as if confirmed. You may mention general possibilities in cautious, non-alarming language.
- Always recommend seeing a healthcare professional for anything concerning.
- Base recommendations only on general wellness knowledge (nutrition, sleep, hydration, activity).
- Keep it supportive and plain-language, not clinical jargon.
"""

RESPONSE_SCHEMA = {
    "type": "object",
    "properties": {
        "summary": {"type": "string", "description": "2-4 sentence plain-language summary"},
        "risk_level": {"type": "string", "enum": ["Low", "Moderate", "See a doctor soon"]},
        "recommendations": {
            "type": "array",
            "items": {"type": "string"},
            "minItems": 3,
            "maxItems": 5,
        },
    },
    "required": ["summary", "risk_level", "recommendations"],
}


def _build_user_message(payload: ReportRequest) -> str:
    return (
        f"Symptoms / concerns: {payload.symptom_details}\n\n"
        f"Breakfast: {payload.breakfast or 'not provided'}\n"
        f"Lunch: {payload.lunch or 'not provided'}\n"
        f"Dinner: {payload.dinner or 'not provided'}\n"
        f"Sleep: {payload.sleep or 'not provided'}"
    )


@router.post("/generate", response_model=ReportOut, status_code=status.HTTP_201_CREATED)
def generate_report(
    payload: ReportRequest,
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_current_user_optional),
):
    if not settings.GEMINI_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="AI report generation isn't configured yet. Set GEMINI_API_KEY on the server.",
        )

    client = genai.Client(api_key=settings.GEMINI_API_KEY)

    try:
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=_build_user_message(payload),
            config=types.GenerateContentConfig(
                system_instruction=SYSTEM_PROMPT,
                response_mime_type="application/json",
                response_schema=RESPONSE_SCHEMA,
            ),
        )
        parsed = json.loads(response.text)
    except (genai_errors.APIError, json.JSONDecodeError, KeyError) as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Couldn't generate a report right now: {e}",
        )

    output = {
        "summary": parsed["summary"],
        "risk_level": parsed["risk_level"],
        "recommendations": parsed["recommendations"],
        "disclaimer": (
            "This is a general wellness summary, not a medical diagnosis. "
            "Please consult a qualified healthcare provider for any health concerns."
        ),
    }

    report = Report(
        user_id=str(current_user.id) if current_user else None,
        input=payload.model_dump(),
        output=output,
    )
    db.add(report)
    db.commit()
    db.refresh(report)

    return ReportOut(id=str(report.id), created_at=report.created_at, **output)


@router.get("", response_model=list[ReportOut])
def list_my_reports(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_optional),
):
    if current_user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")

    reports = (
        db.query(Report)
        .filter(Report.user_id == str(current_user.id))
        .order_by(Report.created_at.desc())
        .all()
    )
    return [
        ReportOut(
            id=str(r.id),
            created_at=r.created_at,
            **r.output,
        )
        for r in reports
    ]
