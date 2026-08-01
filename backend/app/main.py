from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .core.config import settings

app = FastAPI(title="Vault Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)


@app.get("/" )
def root():
    return {"message": "Vault Backend Running"}


@app.get("/health")
def health():
    return {"status": "ok"}
