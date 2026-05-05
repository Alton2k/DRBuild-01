This is a [Next.js](https://nextjs.org) project using SQLite for local development data.

## Getting Started

Install dependencies, prepare the local database, then run the development server:

```bash
npm install
npm run db:reset
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Supabase Auth

Authentication uses Supabase for email/password and Google sign-in. Copy `.env.example` to `.env.local` for local development and fill in:

```text
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
ADMIN_EMAILS=admin@example.com
```

For local Google OAuth and email redirects, add this URL in Supabase and Google:

```text
http://localhost:3000/auth/callback
```

`ADMIN_EMAILS` is a comma-separated list. Only those signed-in users can open `/admin` or run admin moderation actions.

Keep `.env.local` private. For GitHub, Vercel, or another deployment host, add these same values through that service's environment variable settings instead of committing them.

## Local SQLite database

The local SQLite database lives at:

```text
lib/data/app.sqlite
```

SQLite may also create `lib/data/app.sqlite-wal` and `lib/data/app.sqlite-shm` while the app is running. These local database files are ignored by Git.
Everything under `lib/data` is treated as local runtime data except `lib/data/.gitkeep`, so generated data will not be pushed to GitHub.

Database setup is intentionally simple:

- `lib/db/schema.sql` contains the table and index definitions.
- `lib/db.ts` opens `lib/data/app.sqlite`, enables foreign keys/WAL mode, and runs the schema with `CREATE TABLE IF NOT EXISTS`.
- No Prisma or ORM is used.

Useful commands:

```bash
npm run db:seed
```

Creates the database if needed and inserts a small idempotent set of development deals, comments, votes, likes, and a report.

```bash
npm run db:reset
```

Deletes the local SQLite files, recreates the schema, and runs the seed script.

Stop the dev server before resetting if it is currently using the database.

```bash
npm run db:smoke
```

Runs a lightweight check that the schema opens, seeded data exists, the homepage has at least one active approved deal, and comments point at real deals.

## Development

The main app flows read and write SQLite through `lib/deals.ts` and `lib/comments.ts`. Submitted deals start as `pending`; approve them from `/admin` to publish them on the homepage.

Run the usual checks before committing larger changes:

```bash
npm run lint
npm run build
```

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
