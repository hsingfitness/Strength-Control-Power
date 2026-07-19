import os
from dotenv import load_dotenv

load_dotenv()


class Settings:
    # Postgres connection string from Supabase: Project Settings -> Database -> Connection string (URI)
    # Example: postgresql://postgres:[PASSWORD]@db.xxxx.supabase.co:5432/postgres
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./dev.db")

    # Secret used to sign JWTs. MUST be set to a long random value in production.
    JWT_SECRET: str = os.getenv("JWT_SECRET", "dev-secret-change-me-before-deploying-to-production-please")
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRES_MINUTES: int = int(os.getenv("JWT_EXPIRES_MINUTES", "10080"))  # 7 days

    # Comma-separated list of allowed origins for CORS, e.g.
    # "https://yourname.github.io,https://your-custom-domain.com"
    FRONTEND_ORIGINS: str = os.getenv("FRONTEND_ORIGINS", "*")

    # Stripe (used once payments are wired up)
    STRIPE_SECRET_KEY: str = os.getenv("STRIPE_SECRET_KEY", "")
    STRIPE_WEBHOOK_SECRET: str = os.getenv("STRIPE_WEBHOOK_SECRET", "")

    # Anthropic (used for AI-generated health reports)
    ANTHROPIC_API_KEY: str = os.getenv("ANTHROPIC_API_KEY", "")


settings = Settings()
