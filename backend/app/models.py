import uuid
from datetime import datetime

from sqlalchemy import Column, String, DateTime
from sqlalchemy.dialects.postgresql import UUID

from .database import Base, engine


def _uuid_default():
    return str(uuid.uuid4())


# UUID type that also works on SQLite (used for local dev) by falling back to String.
def uuid_column():
    if engine.dialect.name == "postgresql":
        return Column(UUID(as_uuid=False), primary_key=True, default=_uuid_default)
    return Column(String(36), primary_key=True, default=_uuid_default)


class User(Base):
    __tablename__ = "users"

    id = uuid_column()
    name = Column(String(120), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
