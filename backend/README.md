# Vault Backend Foundation

This backend foundation is built with FastAPI, SQLAlchemy, PostgreSQL, and python-dotenv.

## Setup

1. Copy `.env.example` to `.env`.
2. Fill in the environment variables:
   - `DATABASE_URL`
   - `SECRET_KEY`
   - `ACCESS_TOKEN_EXPIRE_MINUTES`

## Install

From the repository root:

```bash
python -m pip install -r backend/requirements.txt
```

## Run server

From the repository root:

```bash
python -m uvicorn backend.app.main:app --reload --host 0.0.0.0 --port 8000
```

## Run migrations later

This project has a SQLAlchemy database configuration and can be extended with Alembic later.

## Project structure

- `backend/app/main.py` - FastAPI application entrypoint
- `backend/app/api/` - API package for routers and route registration
- `backend/app/core/config.py` - environment-based configuration
- `backend/app/db/database.py` - SQLAlchemy engine and session factory
- `backend/app/models/` - placeholder package for database models
- `backend/app/schemas/` - placeholder package for Pydantic schemas
- `backend/app/services/` - placeholder package for backend service logic
- `backend/requirements.txt` - Python dependencies
- `.env.example` - environment variable example file
