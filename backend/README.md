# Deal Rakyat Backend

This folder contains the Strapi 5 backend for Deal Rakyat.

## Stack

- Strapi `5.44.0`
- Users & Permissions plugin for website-user auth
- SQLite through `better-sqlite3` for local development
- PostgreSQL through `pg` for shared/staging/production deployments

## Local Setup

Install backend dependencies from this folder:

```powershell
npm.cmd install
```

Create `backend/.env` from `backend/.env.example`.

For local SQLite:

```env
DATABASE_CLIENT=sqlite
DATABASE_FILENAME=.tmp/data.db
```

For PostgreSQL:

```env
DATABASE_CLIENT=postgres
DATABASE_URL=postgresql://user:password@host/database?sslmode=require
DATABASE_SSL=true
DATABASE_SSL_REJECT_UNAUTHORIZED=false
```

Generate unique values per environment for:

```text
APP_KEYS
API_TOKEN_SALT
ADMIN_JWT_SECRET
TRANSFER_TOKEN_SALT
ENCRYPTION_KEY
JWT_SECRET
```

Do not commit `backend/.env`.

## Commands

From the repository root:

```powershell
npm.cmd run backend:dev
npm.cmd run backend:build
```

From `backend/`:

```powershell
npm.cmd run dev
npm.cmd run build
npm.cmd run start
```

Open the Strapi admin panel at:

```text
http://localhost:1337/admin
```

## API Token

The Next.js frontend needs a Strapi API token in root `.env.local`:

```env
STRAPI_API_TOKEN=your_token_here
```

For local development, create it in:

```text
Strapi Admin -> Settings -> API Tokens
```

Use a token with enough access for the app routes and server actions.

## Content Types

The app relies on code-defined content types under `backend/src/api/`:

```text
deal
comment
deal-vote
deal-report
saved-deal
deal-category
user-setting
```

Do not rename public fields such as `moderationStatus`, `dealDocumentId`, `viewerId`, `authorUserId`, `commentCount`, `score`, or `reportCount` without updating frontend helpers and migrations.

## Migrations

Database migrations live in:

```text
backend/database/migrations/
```

They currently cover:

- vote uniqueness per viewer/deal
- report uniqueness per viewer/deal
- saved-deal uniqueness per user/deal
- user-setting uniqueness per user
- query indexes for deal feeds, profile activity, votes, reports, saved deals, and comments

Migrations are written to be additive and idempotent where practical. Strapi runs pending migrations when the backend starts against a database that has not recorded them.

Production note: adding indexes can briefly lock large tables depending on the database provider. Run backend deploys during a quiet window and keep a database backup available.

## Build Verification

Before deploying backend changes:

```powershell
npm.cmd run build
```

From the repository root, the combined verification command is:

```powershell
npm.cmd run verify
```

## Production Notes

- Use PostgreSQL, not SQLite.
- Set `HOST`, `PORT`, public backend URL settings, database credentials, and all Strapi secrets in the hosting provider.
- Create a production Strapi admin account after first startup.
- Create a production API token and set the frontend `STRAPI_API_TOKEN` to that token.
- Keep website admin access controlled through frontend `ADMIN_EMAILS`.
