from pathlib import Path
import os

from dotenv import load_dotenv
from pydantic import BaseModel, Field, ValidationError

BASE_DIR = Path(__file__).resolve().parent.parent
ENV_FILE = BASE_DIR / ".env"

load_dotenv(dotenv_path=ENV_FILE)


class Settings(BaseModel):
    database_url: str = Field(..., env="DATABASE_URL")
    secret_key: str = Field(..., env="SECRET_KEY")
    access_token_expires_minutes: int = Field(..., env="ACCESS_TOKEN_EXPIRE_MINUTES")


def load_settings() -> Settings:
    values = {
        "database_url": os.getenv("DATABASE_URL", ""),
        "secret_key": os.getenv("SECRET_KEY", ""),
        "access_token_expires_minutes": os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", ""),
    }
    try:
        return Settings(**values)
    except ValidationError as exc:
        raise RuntimeError("Invalid backend configuration") from exc


settings = load_settings()
