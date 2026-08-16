# Vault

## Project Introduction

Vault is a zero-knowledge, cloud-synced password manager for password entries, secure
notes, and files. It pairs a React client with a FastAPI/PostgreSQL backend. All vault
content is encrypted in the browser before it leaves the device; the server stores only
opaque ciphertext and account credentials.

## Features

- Create, view, edit, search, and delete password entries, secure notes, and files.
- Upload files, download them, and preview images.
- Encrypt every record in the browser with AES-256-GCM before it is sent to the backend.
- Two-step access: account sign-in (email + password → JWT), then vault unlock
  (master password → in-memory encryption key).
- Cloud-synced encrypted vault, accessible from any device signed into your account.
- Configurable inactivity auto-lock (5, 15, 30, or 60 minutes, or never).
- Account registration and login with bcrypt password hashing and JWT issuance.
- Rate-limited API endpoints.

## Architecture

```text
React + Vite client
  ├─ Web Crypto API: two PBKDF2 derivations + AES-GCM encryption
  ├─ JWT (localStorage): account session token
  └─ HTTPS client: JWT-authenticated vault API calls
              │
              ▼
FastAPI API  (rate-limited)
  ├─ /auth: /register, /login, /me (JWT)
  ├─ /vault/meta: vault KDF metadata
  └─ /vault/items: encrypted records (CRUD)
              │
              ▼
PostgreSQL
  ├─ users: email, bcrypt hash, timestamps
  ├─ vault_meta: KDF salt, verifier, auto-lock minutes
  └─ vault_items: user_id, IV, ciphertext
```

The server stores only encrypted blobs — it never sees plaintext passwords, notes, or
files. Vault content is decrypted exclusively in the browser.

## Zero-Knowledge Design

Two independent derivations are performed in the browser from the master password:

1. **Encryption key (never leaves the browser).** PBKDF2-HMAC-SHA-256 with a random
   16-byte salt and 250,000 iterations derives a non-extractable AES-256-GCM key. A
   random 12-byte IV is used for each encryption. The key exists only in memory and is
   cleared when the vault locks.
2. **Auth value (sent to the server).** A second PBKDF2-HMAC-SHA-256 derivation, salted
   with SHA-256(email + "vault-auth-v1"), produces an `authValue` transmitted as the
   account password and bcrypt-hashed server-side.

Because the two derivations use different salts, a server compromise exposes only the
bcrypt hash of the auth value and reveals nothing about the AES encryption key. The
server receives no key material, no master password, and no plaintext records.

## Security

### Authentication

- `POST /register` normalizes the email and stores a bcrypt hash (13 rounds, Passlib).
- `POST /login` verifies the hash and returns an HS256 JWT (python-jose) with a
  configurable expiry (30 minutes by default).
- Protected routes use a JWT bearer dependency that validates signature and `exp`.
- The raw account password is never sent; the client sends the derived `authValue`.
- Login/register are limited to 5 requests/min/IP; vault endpoints 30–60/min/IP.

### Vault Protection

- AES-256-GCM provides authenticated encryption for every record payload.
- A separately encrypted random verifier confirms the master password before unlock.
- The master password and encryption key are never written to storage.
- Auto-lock clears the in-memory key and React state after inactivity.

This project is in-progress and has not been independently security-audited. Clearing
browser site data logs you out; the encrypted vault remains on the server.

## Tech Stack

| Area | Technologies |
|------|--------------|
| Frontend | React, Vite, Tailwind CSS, React Router |
| Backend | Python, FastAPI, SQLAlchemy 2.0, SlowAPI |
| Database | PostgreSQL |
| Authentication | JWT (HS256), bcrypt (Passlib) |
| Encryption | Web Crypto API, PBKDF2-HMAC-SHA-256, AES-256-GCM |

## Project Structure

```text
.
├── backend/
│   ├── app/
│   │   ├── api/auth.py        # Register, login, JWT dependency
│   │   ├── api/vault.py       # Vault meta + item CRUD endpoints
│   │   ├── core/config.py     # Environment-based settings
│   │   ├── db/database.py     # SQLAlchemy engine and session
│   │   ├── models/            # User, VaultItem, VaultMeta
│   │   ├── schemas/           # Pydantic request/response models
│   │   └── main.py            # FastAPI app + middleware
│   ├── requirements.txt
│   └── tests/
├── frontend/
│   ├── src/
│   │   ├── api/               # Auth API client
│   │   ├── components/        # UI and vault components
│   │   ├── contexts/          # Auth and theme providers
│   │   ├── pages/             # Login, register, unlock, vault
│   │   └── vault/vaultService.js  # Derivation, encryption, vault API
│   ├── package.json
│   └── tests/
├── .env.example
└── README.md
```

## Local Development Setup

### Prerequisites

- Node.js and npm
- Python 3.10+
- PostgreSQL running locally

### 1. Create the database

```sql
CREATE DATABASE vaultdb;
```

### 2. Configure and start the backend

Create `backend/.env`:

```dotenv
DATABASE_URL=postgresql+psycopg2://postgres:postgres@localhost:5432/vaultdb
SECRET_KEY=change-me-to-a-long-random-string
ACCESS_TOKEN_EXPIRE_MINUTES=30
CORS_ALLOWED_ORIGINS=http://localhost:5173
```

Install dependencies and run:

```bash
python -m pip install -r backend/requirements.txt
python -m uvicorn backend.app.main:app --reload --port 8000
```

Tables are created automatically on startup (`Base.metadata.create_all`). The API is
available at `http://localhost:8000`; health check is `GET /health`.

### 3. Configure and start the frontend

Create `frontend/.env`:

```dotenv
VITE_API_BASE_URL=http://localhost:8000
```

```bash
cd frontend
npm install
npm run dev
```

Vite serves the client at `http://localhost:5173`. The backend permits that origin by
default.

## Environment Variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | Yes | SQLAlchemy PostgreSQL connection URL. |
| `SECRET_KEY` | Yes | Secret used to sign JWT access tokens. |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | No | JWT lifetime in minutes; defaults to `30`. |
| `CORS_ALLOWED_ORIGINS` | No | Comma-separated allowed client origins; defaults to `http://localhost:5173`. |
| `VITE_API_BASE_URL` | Yes for API calls | Frontend base URL for the FastAPI API. Set in `frontend/.env`. |

Never commit real secrets or database credentials.

## Current Status

Working two-step auth (JWT gate + vault unlock), encrypted cloud-synced records, file
upload/download/image preview, auto-lock. There is no refresh-token flow or password
recovery yet.

## Future Roadmap

- Add automated frontend and backend test execution to project scripts and CI.
- Define a backup/export and recovery strategy for encrypted data.
- Introduce managed database migrations (the SQLAlchemy configuration can be extended
  with Alembic later).

## License

No license file is currently included in this repository. All rights are reserved until
a license is added by the project owner.