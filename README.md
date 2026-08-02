# Vault

## Project Introduction

Vault is an offline-first web application for storing password entries, secure notes, and files in a browser-local encrypted vault. It pairs a React client with a FastAPI/PostgreSQL authentication service. Vault content is encrypted and persisted on the client; the backend stores account credentials only.

## Features

- Create, view, edit, search, and delete password entries and secure notes.
- Add locally stored files, download them, and preview images.
- Encrypt password, note, and file records in the browser before they are written to IndexedDB.
- Create or unlock a vault with a locally derived master-password key.
- Configurable inactivity auto-lock (5, 15, 30, or 60 minutes, or never).
- Account registration and login API endpoints with password hashing and JWT issuance.
- Offline local storage through IndexedDB and Dexie.

## Architecture

```text
React + Vite client
  ├─ Web Crypto API: PBKDF2 key derivation and AES-GCM encryption
  ├─ Dexie / IndexedDB: encrypted vault records and vault metadata
  └─ HTTP client: registration and login requests
              │
              ▼
FastAPI API
  ├─ /register: bcrypt-hashed account password in PostgreSQL
  └─ /login: HS256 JWT access token
              │
              ▼
PostgreSQL: users table (email, bcrypt password hash, timestamps)
```

Vault content has no API endpoint and is not sent to the server. Passwords, notes, and files remain in the browser's IndexedDB database.

## Zero-Knowledge Design

Vault is zero-knowledge with respect to vault contents because encryption and decryption take place exclusively in the browser:

- The master password is used locally to derive a non-extractable AES-256-GCM key with PBKDF2-HMAC-SHA-256, a random 16-byte salt, and 250,000 iterations.
- A randomly generated 12-byte IV is used for each AES-GCM encryption operation.
- IndexedDB stores encrypted records as ciphertext plus their IV, along with non-secret vault metadata such as the KDF salt and encrypted verifier.
- The derived key is held only in the active in-memory browser session and is cleared when the vault is locked.

The backend never has access to plaintext vault data because no vault records, encryption keys, master-password-derived keys, or decrypted files are transmitted to it. PostgreSQL contains user-account data, not vault contents.

## Security

### Authentication

The FastAPI backend registers users in PostgreSQL, normalizes email addresses, and hashes account passwords with bcrypt through Passlib. `POST /login` verifies the bcrypt hash and returns an HS256 JWT access token with a configurable expiration (30 minutes by default). The frontend persists a returned access token in `localStorage`.

The active unlock route currently uses the local master-password flow directly; it does not call the login endpoint during unlock. Account creation does call `POST /register`. The repository includes frontend API and authentication-context code for login, but account authentication is not yet enforced as a gate for the active vault route.

### Vault Protection

- AES-GCM provides authenticated encryption for vault record payloads.
- A separately encrypted random verifier checks whether the entered master password can decrypt the vault.
- The master password is not deliberately saved in `localStorage`, `sessionStorage`, or cookies.
- Auto-lock clears the active in-memory vault session after configured inactivity.

This project is an in-progress application and has not been presented as independently security-audited. Clearing browser site data can delete the locally stored vault.

## Tech Stack

| Area | Technologies |
| --- | --- |
| Frontend | React 19, Vite, React Router, Tailwind CSS |
| Local data | IndexedDB, Dexie, Dexie React Hooks |
| Client cryptography | Web Crypto API, PBKDF2-HMAC-SHA-256, AES-256-GCM |
| Backend | Python, FastAPI, SQLAlchemy, Pydantic |
| Authentication | Passlib/bcrypt, python-jose JWT (HS256) |
| Database | PostgreSQL via psycopg2 |

## Project Structure

```text
.
├── backend/
│   ├── app/
│   │   ├── api/auth.py          # Registration and login endpoints
│   │   ├── core/config.py       # Environment-based settings
│   │   ├── db/database.py       # SQLAlchemy engine and session
│   │   ├── models/user.py       # PostgreSQL user model
│   │   └── main.py              # FastAPI application
│   ├── requirements.txt
│   └── tests/
├── frontend/
│   ├── src/
│   │   ├── api/                 # Backend API client
│   │   ├── components/          # UI and vault components
│   │   ├── db/db.js             # IndexedDB schema
│   │   ├── pages/               # Unlock and vault views
│   │   └── vault/vaultService.js# Encryption and vault persistence
│   ├── package.json
│   └── tests/
├── .env.example
└── README.md
```

## Local Development Setup

### Prerequisites

- Node.js and npm
- Python 3.10+ recommended
- PostgreSQL

### 1. Configure the backend

Create `backend/.env` with the variables described below. The backend loads this exact path at startup.

Install Python dependencies from the repository root:

```bash
python -m pip install -r backend/requirements.txt
```

Start the API:

```bash
python -m uvicorn backend.app.main:app --reload --host 0.0.0.0 --port 8000
```

The API is available at `http://localhost:8000`; its health endpoint is `GET /health`.

### 2. Configure and start the frontend

Create `frontend/.env.local`:

```dotenv
VITE_API_BASE_URL=http://localhost:8000
```

Install dependencies and start Vite:

```bash
cd frontend
npm install
npm run dev
```

Vite serves the client at the URL it prints (normally `http://localhost:5173`). The backend permits that origin by default.

## Environment Variables

The included root `.env.example` lists the required backend values. The application code reads them from `backend/.env`.

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | Yes | SQLAlchemy PostgreSQL connection URL. |
| `SECRET_KEY` | Yes | Secret used to sign JWT access tokens. |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | No | JWT lifetime in minutes; defaults to `30`. |
| `CORS_ALLOWED_ORIGINS` | No | Comma-separated allowed client origins; defaults to `http://localhost:5173`. |
| `VITE_API_BASE_URL` | Yes for account API calls | Frontend base URL for the FastAPI API. Set in `frontend/.env.local`. |

Never commit real secrets or database credentials.

## Current Status

Vault currently supports a local encrypted vault for passwords, notes, and files, including file download and image preview. Local data is encrypted at rest in IndexedDB and the vault can auto-lock.

The FastAPI/PostgreSQL registration and login endpoints are implemented. The registration flow in the active unlock page calls the API, but the active unlock callback currently opens the local vault without invoking API login or enforcing the JWT. There is no vault-data backend, synchronization, deployment configuration, refresh-token flow, or password-recovery mechanism in the current implementation.

## Future Roadmap

- Integrate API authentication and JWT enforcement into the active vault entry flow.
- Add protected backend endpoints only if a future design requires them without compromising client-side encryption.
- Add automated frontend and backend test execution to project scripts and CI.
- Define a backup/export and recovery strategy appropriate for local encrypted data.
- Introduce managed database migrations.

## Screenshot Placeholders

<!-- Add screenshots here when they are available. -->

- `[Placeholder]` Unlock and vault-creation screen
- `[Placeholder]` Vault item list and search
- `[Placeholder]` Password, secure-note, and file detail views

## License

No license file is currently included in this repository. All rights are reserved until a license is added by the project owner.
