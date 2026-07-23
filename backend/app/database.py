from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import sessionmaker, declarative_base

from .config import settings

connect_args = {"check_same_thread": False} if settings.DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(settings.DATABASE_URL, connect_args=connect_args, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# Columns that have been added to models after the table may already have
# existed in a deployed database. Base.metadata.create_all() only creates
# whole tables that are missing — it never alters an existing table — so
# without this, a deployed DB from before one of these fields existed would
# be stuck permanently missing it (breaking login/signup with a DB error)
# until someone manually ran an ALTER TABLE. This runs it automatically,
# safely, on every startup instead.
COLUMN_MIGRATIONS = {
    "users": [
        ("role", "VARCHAR(20) NOT NULL DEFAULT 'user'"),
        ("plan", "VARCHAR(20) NOT NULL DEFAULT 'free'"),
        ("permissions", "JSON NOT NULL DEFAULT '{}'"),
    ],
}


def run_column_migrations() -> None:
    inspector = inspect(engine)
    existing_tables = set(inspector.get_table_names())

    with engine.begin() as conn:
        for table, columns in COLUMN_MIGRATIONS.items():
            if table not in existing_tables:
                continue  # brand-new DB: create_all() already made it with every column

            existing_columns = {c["name"] for c in inspector.get_columns(table)}

            for name, ddl_type in columns:
                if name in existing_columns:
                    continue
                conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {name} {ddl_type}"))
