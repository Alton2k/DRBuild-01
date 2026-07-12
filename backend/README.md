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

Create `backend/.env` from the existing project env file whenever this machine should use the shared project database. Ask the project owner or copy it from the previous machine. The env file contains both the database connection and Strapi secrets.

For the shared/existing PostgreSQL database:

```env
DATABASE_CLIENT=postgres
DATABASE_URL=postgresql://user:password@host/database?sslmode=verify-full
DATABASE_SSL=true
DATABASE_SSL_REJECT_UNAUTHORIZED=true
```

If Strapi asks you to create a new admin profile when you expected existing data, stop and check `backend/.env`. It usually means the backend is pointed at an empty database.

Use SQLite only for throwaway local testing:

```env
DATABASE_CLIENT=sqlite
DATABASE_FILENAME=.tmp/data.db
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

When connecting to an existing project database, use the existing Strapi secret values instead of generating new ones.

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
npm.cmd run db:check
```

`db:check` is a read-only PostgreSQL readiness audit. Run it after the backend has started once against a new environment so Strapi can create its tables and apply repository migrations.

Production startup requires `DATABASE_CLIENT=postgres` and an explicit `DATABASE_URL`. This guard prevents a missing production secret from silently starting an empty SQLite database.

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
comment-report
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
- a nullable comment `edited_at` timestamp used only for owner-authored body edits
- comment report counts and a database-unique private report key for duplicate protection
- removal of the placeholder comment `test` field, archiving any populated legacy values before the column is dropped
- a private SHA-256 comment submission key and unique index that closes concurrent duplicate-comment races

Migrations are written to be additive and idempotent where practical. Strapi runs pending migrations when the backend starts against a database that has not recorded them.

Production note: adding indexes can briefly lock large tables depending on the database provider. Run backend deploys during a quiet window and keep a database backup available.

The comment edit migration is additive and safe for existing rows: historical comments keep `edited_at` as `NULL` until their owner edits the body. Apply it through the normal Strapi startup/deploy process; do not infer edits from Strapi's general `updated_at` field because likes also update comment records.

Comment reports use the `comment-report` content type. Backend bootstrap verifies the unique `comment_reports.report_key` index after Strapi has synchronized content tables, including on a fresh database where the table does not exist during the earlier migration phase.

New comments receive an account-based submission key (or an anonymous-viewer key when signed out). Backend bootstrap verifies `comments_submission_key_uq` after schema synchronization; legacy rows remain nullable and the existing duplicate preflight continues to cover them.

The placeholder-field cleanup preserves any nonempty legacy `comments.test` values in `comment_test_field_archive`. The application does not expose that archive; it exists only to keep the corrective migration reversible.

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
- On Railway, set this service's root directory to `/backend` and its config file path to `/backend/railway.json`.
- Set `PUBLIC_URL` to the public Strapi origin and `IS_PROXIED=true` so admin and uploaded-asset URLs are correct behind Railway's proxy.
- Production uploads use Cloudflare R2 through the S3-compatible provider. Set `R2_ENDPOINT`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, and `R2_PUBLIC_URL` in Railway.
- Configure the R2 bucket to allow cross-origin `GET` requests from `PUBLIC_URL` so Strapi Media Library can display external thumbnails and previews.
- Leave `R2_ENDPOINT` unset only for local development with Strapi's local upload provider. Do not rely on Railway's ephemeral filesystem for production uploads.
