from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .database import Base, SessionLocal, engine, run_column_migrations
from .routers import admin, auth, payments, products, reports
from .seed import seed_products

# Creates tables if they don't exist yet. Fine for this project's current size;
# swap for Alembic migrations later if the schema grows.
Base.metadata.create_all(bind=engine)

# Adds any columns that were added to a model after the table already
# existed in a deployed database (create_all() above only creates whole
# missing tables, never alters existing ones).
run_column_migrations()

with SessionLocal() as _db:
    seed_products(_db)

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
app.include_router(payments.router, prefix="/api")
app.include_router(reports.router, prefix="/api")
app.include_router(products.router, prefix="/api")
app.include_router(admin.router, prefix="/api")


@app.get("/")
def health_check():
    return {"status": "ok"}
