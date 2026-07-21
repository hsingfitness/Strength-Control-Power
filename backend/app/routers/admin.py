from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import get_current_user, require_role
from ..models import User
from ..schemas import ALLOWED_PERMISSIONS, OperatorCreate, OperatorOut, OperatorPermissionsUpdate
from ..security import hash_password

router = APIRouter(prefix="/admin", tags=["admin"])


def _clean_permissions(permissions: dict) -> dict:
    return {k: bool(v) for k, v in permissions.items() if k in ALLOWED_PERMISSIONS}


@router.get("/operators", response_model=list[OperatorOut])
def list_operators(
    db: Session = Depends(get_db),
    _current_user: User = Depends(require_role("super_admin")),
):
    operators = (
        db.query(User)
        .filter(User.role.in_(["operator", "super_admin"]))
        .order_by(User.created_at.asc())
        .all()
    )
    return operators


@router.post("/operators", response_model=OperatorOut, status_code=status.HTTP_201_CREATED)
def create_operator(
    payload: OperatorCreate,
    db: Session = Depends(get_db),
    _current_user: User = Depends(require_role("super_admin")),
):
    existing = db.query(User).filter(User.email == payload.email.lower()).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="An account with this email already exists.")

    operator = User(
        name=payload.name.strip(),
        email=payload.email.lower(),
        password_hash=hash_password(payload.password),
        role="operator",
        permissions=_clean_permissions(payload.permissions),
    )
    db.add(operator)
    db.commit()
    db.refresh(operator)
    return operator


@router.patch("/operators/{operator_id}", response_model=OperatorOut)
def update_operator_permissions(
    operator_id: str,
    payload: OperatorPermissionsUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("super_admin")),
):
    operator = db.query(User).filter(User.id == operator_id).first()
    if not operator:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Operator not found.")
    if operator.role == "super_admin":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Super admin permissions can't be edited here.")

    operator.permissions = _clean_permissions(payload.permissions)
    db.commit()
    db.refresh(operator)
    return operator


@router.delete("/operators/{operator_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_operator(
    operator_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("super_admin")),
):
    if str(operator_id) == str(current_user.id):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="You can't remove your own admin access.")

    operator = db.query(User).filter(User.id == operator_id).first()
    if not operator:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Operator not found.")
    if operator.role == "super_admin":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Can't remove another super admin from here.")

    # Demote back to a regular user rather than deleting the account outright,
    # so their order/report history is preserved.
    operator.role = "user"
    operator.permissions = {}
    db.commit()
