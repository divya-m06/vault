import sys
from pathlib import Path

from fastapi.testclient import TestClient

sys.path.append(str(Path(__file__).resolve().parents[1]))

from app.db.database import Base, engine
from app.main import app

Base.metadata.drop_all(bind=engine)
Base.metadata.create_all(bind=engine)

client = TestClient(app)


def run_checks():
    success_response = client.post(
        "/register",
        json={"email": "user@example.com", "password": "Password123!"},
    )
    assert success_response.status_code == 201, success_response.text
    success_body = success_response.json()
    assert success_body["email"] == "user@example.com"
    assert "password_hash" not in success_body
    assert "password" not in success_body

    duplicate_response = client.post(
        "/register",
        json={"email": "user@example.com", "password": "Password123!"},
    )
    assert duplicate_response.status_code == 409, duplicate_response.text

    invalid_email_response = client.post(
        "/register",
        json={"email": "not-an-email", "password": "Password123!"},
    )
    assert invalid_email_response.status_code == 422, invalid_email_response.text

    short_password_response = client.post(
        "/register",
        json={"email": "other@example.com", "password": "short"},
    )
    assert short_password_response.status_code == 422, short_password_response.text

    print("registration checks passed")


if __name__ == "__main__":
    run_checks()
