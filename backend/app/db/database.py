from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

from ..core.config import settings

engine = create_engine(settings.database_url, future=True)
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
    future=True,
)

Base = declarative_base()
