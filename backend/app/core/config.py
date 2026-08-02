from pathlib import Path
import os

from dotenv import load_dotenv
from pydantic import BaseModel, Field, ValidationError

BASE_DIR = Path(__file__).resolve().parent.parent.parent
ENV_FILE = BASE_DIR / ".env"

load_dotenv(dotenv_path=ENV_FILE)


class Settings(BaseModel):
    database_url: str
    secret_key: str
    access_token_expires_minutes: int = Field(default=30)
    cors_allowed_origins: list[str] = Field(default_factory=lambda: ["http://localhost:5173"])


def load_settings() -> Settings:
    values = {
        "database_url": os.getenv("DATABASE_URL"),
        "secret_key": os.getenv("SECRET_KEY"),
        "access_token_expires_minutes": int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30")),
        "cors_allowed_origins": [
            origin.strip()
            for origin in os.getenv("CORS_ALLOWED_ORIGINS", "http://localhost:5173").split(",")
            if origin.strip()
        ],
    }

    if not values["database_url"]:
        raise RuntimeError("DATABASE_URL environment variable is required")

    if not values["secret_key"]:
        raise RuntimeError("SECRET_KEY environment variable is required")

    try:
        return Settings(**values)
    except ValidationError as exc:
        raise RuntimeError("Invalid backend configuration") from exc


settings = load_settings()
