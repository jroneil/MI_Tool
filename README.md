# AtlasBuilder (MI_Tool)

A SaaS-style platform scaffold for generating CRUD dashboards from user-defined models. Built with Next.js (App Router), FastAPI, PostgreSQL, Tailwind, and shadcn-inspired components.

## Features
- Email/password authentication with workspace memberships and roles
- Model builder supporting string, number, boolean, date, enum, long text, and relation fields
- Auto-generated CRUD endpoints and React screens for each model
- Record limit enforcement for tiering
- Docker Compose for frontend, backend, and Postgres
- Marketing-ready landing page copy targeted at small teams and agencies

## Getting Started

### Prerequisites
- Docker and Docker Compose

### Quickstart
```bash
docker compose up --build
```
- Frontend: http://localhost:3000
- Backend: http://localhost:8000/api

Default configuration uses `FREE_RECORD_LIMIT=500` for the free tier. Override in `docker-compose.yml`.

## Backend (FastAPI)
- Location: `backend/`
- Entrypoint: `app/main.py`
- Dynamic model definitions persisted via SQLAlchemy, with JSONB storage for record data.
- Authentication endpoints under `/api/auth` support registration and JWT token issuance.

### Migrations
Apply initial tables using the SQL in `backend/migrations/001_init.sql` or rely on automatic table creation on startup.

## Frontend (Next.js App Router)
- Location: `frontend/`
- Uses Tailwind and minimal shadcn-inspired UI.
- Contains onboarding, auth, workspace selection, model builder, and generated app views.

## Environment Variables
- `DATABASE_URL`: PostgreSQL connection string (asyncpg)
- `JWT_SECRET`: Secret for signing JWT access tokens
- `FREE_RECORD_LIMIT`: Max records for free tier (integer)
- `NEXT_PUBLIC_API_URL`: Frontend API base URL

## Licensing
MIT
