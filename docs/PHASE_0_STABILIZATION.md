# RIHLA Phase 0 Stabilization

This phase keeps the existing FastAPI, React, and Billing Engine architecture intact. It only normalizes the repository packaging and removes unsafe defaults from files that can be committed.

## What changed

- Unpacked the existing RIHLA platform source tree into the Git repository.
- Removed the ZIP archive from version control.
- Excluded generated artifacts, local environment files, deploy tokens, local scratch payloads, and bundled helper tooling from Git.
- Replaced committed credentials in examples, seed scripts, docs, and E2E tests with environment-driven placeholders.
- Kept local development seed scripts guarded by `ENVIRONMENT=development` / `RIHLA_SEED_ALLOW=1`.
- Reconciled minimal compile-time drift between generated schemas/components and existing callers so the unpacked repository can build without changing feature behavior.

## Required secret rotation

The prior packaged artifact exposed deploy/API/database/admin credentials. Treat them as compromised and rotate them before production use:

1. Fly.io API token.
2. Backend `.env` values, especially `SECRET_KEY`, `JWT_SECRET_KEY`, `DATABASE_URL`, `ANTHROPIC_API_KEY`, Stripe, Microsoft, SMTP, Firebase, S3, and Teams webhook values.
3. Database and Redis passwords.
4. Seeded/admin user passwords in every deployed or shared database.

Generate backend secrets with:

```bash
openssl rand -hex 32
```

## Local development setup

```bash
cp .env.example .env
cp backend/.env.example backend/.env
cp billing-engine/.env.example billing-engine/.env
```

Fill real local values in the copied `.env` files. Do not commit them.

For local demo seeding:

```bash
export ENVIRONMENT=development
export ADMIN_EMAIL=admin@stours.local
export ADMIN_PASSWORD='replace-with-local-password'
cd backend
python -m scripts.seed_admin
```

For Playwright login tests, provide matching credentials:

```bash
export E2E_ADMIN_EMAIL=admin@stours.local
export E2E_ADMIN_PASSWORD='replace-with-local-password'
```

## Deployment notes

Deployment scripts must read provider tokens from environment variables such as `FLY_API_TOKEN`; tokens must never be hardcoded in repository files.

## Validation performed

```bash
grep -R "FlyV1\|sk-ant-api03-\|Abdo@1937\|rihla_secret\|change-me-in-production" .
python -m compileall -q backend/app
npm --prefix frontend run build
npm --prefix billing-engine run build
ENVIRONMENT=test backend/.venv/bin/python -m pytest backend/tests
```

Results:

- Secret grep returned no matches for the exposed credential patterns.
- Backend syntax compilation passed.
- Frontend production build passed.
- Billing Engine NestJS build passed after regenerating Prisma client from the checked-in schema.
- Backend pytest collected 251 tests. Collection and execution work, but the suite still has pre-existing functional failures around project/CRM/dashboard/flight endpoints and expects a local PostgreSQL service for some startup paths.
