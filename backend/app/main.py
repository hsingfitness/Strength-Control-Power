from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .database import Base, engine
from .routers import auth

# Creates tables if they don't exist yet. Fine for this project's current size;
# swap for Alembic migrations later if the schema grows.
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Health Management API")

origins = (
    ["*"]
    if settings.FRONTEND_ORIGINS.strip() == "*"
    else [o.strip() for o in settings.FRONTEND_ORIGINS.split(",") if o.strip()]
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api")


@app.get("/")
def health_check():
    return {"status": "ok"}
