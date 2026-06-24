# Deal Rakyat

Deal Rakyat is a Next.js frontend with a Strapi CMS/API backend for a Malaysia-focused deal marketplace.

## Stack

Frontend:

- Next.js `16.2.4`
- React `19.2.4`
- Tailwind CSS `4`
- Playwright `1.59.1` for product metadata scraping

Backend:

- Strapi `5.44.0`
- `@strapi/plugin-users-permissions` `5.44.0`
- Local Strapi database: SQLite through `better-sqlite3` `12.8.0`
- Live Strapi database: PostgreSQL through `pg`

Auth:

- Strapi Users & Permissions JWT auth
- Register/login is handled by Strapi endpoints
- JWT is stored by Next.js in an HTTP-only cookie named `dealmy_strapi_jwt`
- Email verification is currently disabled until an email provider is chosen

## Current Features

- Searchable and paginated deal feed with category and subcategory filters
- Feed ranking by community score, comment count, or newest deals
- Malaysia-time daily, weekly, and monthly ranking periods
- Product metadata scraping with Playwright during deal submission
- Deal image galleries, shipping cost, expiration time, and rich descriptions
- Automated duplicate, link safety, content risk, and moderation checks
- Anonymous deal voting with transactional score updates
- Threaded comments with likes and ownership-based deletion
- Deal reporting with duplicate-report and rate-limit protection
- Saved deals for signed-in users
- Profile activity for posted deals, saved deals, comments, vote stats, and follow counts
- Public member profiles with profile privacy controls and follow/unfollow support
- Account settings for avatar, username, bio, theme, notifications, and privacy preferences
- Admin moderation for deals, reports, comments, and users
- Sitemap, robots rules, canonical metadata, and Open Graph branding
- About, contact, privacy, terms, community rules, and affiliate disclosure pages

## Partner AI Setup Summary

Use this section if an AI assistant is setting up the project on another computer.

Important:

- Do not commit `.env.local` or `backend/.env`.
- Ask the project owner privately for `DATABASE_URL` and `STRAPI_API_TOKEN`.
- The frontend runs from the project root.
- The Strapi backend runs from `backend/`.
- Local development can use Neon PostgreSQL through `DATABASE_URL`.

Setup order:

1. Install Node.js `24.x`.
2. Run `npm.cmd install` in the project root.
3. Run `npm.cmd install` inside `backend/`.
4. Create `backend/.env` using the template in this README.
5. Start Strapi with `npm.cmd run backend:dev`.
6. Open `http://localhost:1337/admin`.
7. Create or log in to the Strapi admin account.
8. Create a Strapi API token.
9. Create `.env.local` using the template in this README.
10. Start Next.js with `npm.cmd run dev`.
11. Open `http://localhost:3000`.

## Project Structure

```text
D:\Web Project\DRBuild-01
|- app/                  Next.js app routes and server actions
|- components/           Next.js UI components
|- lib/                  frontend data/auth helpers
|- backend/              Strapi 5 backend app
|- scripts/              local maintenance scripts
|- package.json          frontend/root scripts
`- README.md
```

Important files:

```text
app/actions.ts
app/auth/actions.ts
lib/auth.ts
lib/deals.ts
lib/comments.ts
lib/savedDeals.ts
lib/userSettings.ts
lib/follows.ts
lib/strapi.ts
backend/src/api/deal/content-types/deal/schema.json
backend/src/api/saved-deal/content-types/saved-deal/schema.json
backend/src/api/user-setting/content-types/user-setting/schema.json
backend/src/api/follow/content-types/follow/schema.json
backend/src/index.ts
```

## Prerequisites

Install Node.js with npm.

Recommended:

```text
Node.js 24.x
npm 11.x
```

Strapi backend allows:

```text
node >=20.0.0 <=24.x.x
npm >=6.0.0
```

On Windows PowerShell, use `npm.cmd` if `npm` is blocked by execution policy.

## Fresh Setup

From the project root:

```powershell
cd "D:\Web Project\DRBuild-01"
npm.cmd install
```

Install Strapi backend dependencies:

```powershell
cd "D:\Web Project\DRBuild-01\backend"
npm.cmd install
```

Return to the root:

```powershell
cd "D:\Web Project\DRBuild-01"
```

Install Playwright Chromium for the product scraper:

```powershell
npx.cmd playwright install chromium
```

## Environment Variables

These files are intentionally ignored by Git:

```text
.env.local
backend/.env
```

Create this frontend env file:

```text
D:\Web Project\DRBuild-01\.env.local
```

Template:

```env
STRAPI_URL=http://127.0.0.1:1337
STRAPI_API_TOKEN=paste_your_strapi_api_token_here
ADMIN_EMAILS=local@example.com
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

Notes:

- `STRAPI_URL` points the Next.js frontend to Strapi.
- `STRAPI_API_TOKEN` must be created in Strapi Admin.
- `ADMIN_EMAILS` is the website user email allowed to open `/admin`.
- `ADMIN_EMAILS` is not the Strapi admin email unless the same email is also used for the website login.
- `NEXT_PUBLIC_SITE_URL` is used for canonical and sitemap URLs. Set it to the deployed frontend origin in production.

Create this backend env file:

```text
D:\Web Project\DRBuild-01\backend\.env
```

Template for Neon PostgreSQL:

```env
# Server
HOST=0.0.0.0
PORT=1337

# Secrets
APP_KEYS=paste_or_generate_secret_values_here
API_TOKEN_SALT=paste_or_generate_secret_value_here
ADMIN_JWT_SECRET=paste_or_generate_secret_value_here
TRANSFER_TOKEN_SALT=paste_or_generate_secret_value_here
ENCRYPTION_KEY=paste_or_generate_secret_value_here
JWT_SECRET=paste_or_generate_secret_value_here

# Database
DATABASE_CLIENT=postgres
DATABASE_URL=postgresql://user:password@host/database?sslmode=require
DATABASE_SSL=true
DATABASE_SSL_REJECT_UNAUTHORIZED=false
DATABASE_SCHEMA=public
DATABASE_POOL_MIN=2
DATABASE_POOL_MAX=10
DATABASE_CONNECTION_TIMEOUT=60000

# Optional, only used if email verification is enabled later
FRONTEND_URL=http://localhost:3000/auth?message=email-confirmed
```

If the owner gives you an existing `backend/.env`, use that instead of generating new Strapi secret values.

For local SQLite instead of Neon PostgreSQL, use:

```env
DATABASE_CLIENT=sqlite
DATABASE_FILENAME=.tmp/data.db
```

If `DATABASE_URL` is not set, Strapi falls back to local SQLite at `backend/.tmp/data.db`.

## Running Locally

Use two terminals.

Terminal 1, start Strapi:

```powershell
cd "D:\Web Project\DRBuild-01"
npm.cmd run backend:dev
```

Open Strapi admin:

```text
http://localhost:1337/admin
```

Create the first Strapi admin user.

Create an API token:

```text
Strapi Admin -> Settings -> API Tokens -> Create new API Token
```

For local development, use:

```text
Token type: Full access
Token duration: Unlimited
```

Paste that token into `.env.local` as `STRAPI_API_TOKEN`.

Terminal 2, start Next.js:

```powershell
cd "D:\Web Project\DRBuild-01"
npm.cmd run dev
```

Open:

```text
http://localhost:3000
```

## Live PostgreSQL Setup

Recommended free live database:

```text
Neon Postgres
```

Create a Neon project, copy the PostgreSQL connection string, then set it as:

```env
DATABASE_URL=your_neon_connection_string
DATABASE_CLIENT=postgres
DATABASE_SSL=true
DATABASE_SSL_REJECT_UNAUTHORIZED=false
```

Important:

- Local SQLite data is not automatically moved to Neon.
- When Strapi first connects to a fresh Postgres database, it creates the required tables.
- After switching database, create a new Strapi admin user for that live backend.
- Create a new live Strapi API token and put it in the Next.js `STRAPI_API_TOKEN`.

## Auth Behavior

Website users are Strapi Users & Permissions users, not Strapi admin users.

Two different account types exist:

```text
Strapi Admin User
Used at http://localhost:1337/admin
Manages CMS/backend.

Website User
Used at http://localhost:3000/auth
Can post deals and use the public website.
```

Register/login flow:

```text
Next.js auth form
-> Strapi /api/auth/local/register or /api/auth/local
-> Strapi returns JWT
-> Next.js stores JWT in HTTP-only cookie
-> lib/auth.ts calls /api/users/me to read current user
```

Email verification is currently disabled in:

```text
backend/src/index.ts
```

Current setting:

```ts
email_confirmation: false
```

To enable email verification later:

1. Configure a Strapi email provider such as SMTP, Mailtrap, SendGrid, Mailgun, Resend, or Amazon SES.
2. Change `email_confirmation` to `true`.
3. Change signup behavior in `app/auth/actions.ts` so registration does not auto-login.

## Strapi Content Types

These content types are defined in code:

```text
Deal
Comment
Deal Vote
Deal Report
Deal Category
Saved Deal
User Setting
Follow
```

Deal moderation field:

```text
moderationStatus
```

Allowed values:

```text
pending
approved
rejected
```

Do not rename it back to `status`; `status` conflicts with Strapi 5 internal document status behavior.

## Moderation Flow

The public homepage only shows:

```text
moderationStatus = approved
isExpired = false
```

New submissions run through moderation checks in:

```text
app/actions.ts
```

Rules:

- Admin user posts are auto-approved.
- Trusted users are auto-approved when clean.
- New users go pending.
- Users with rejected history go pending.
- Duplicate URLs go pending.
- Risk checks go pending.

Automated risk checks include:

- adult/restricted keywords
- gambling/casino terms
- suspicious marketing claims
- shortened/chat links
- too-short title
- too-short description
- missing product image
- duplicate URL

Use the custom admin page for moderation:

```text
http://localhost:3000/admin
```

Set `ADMIN_EMAILS` in `.env.local` to the email of a registered website user.

Example:

```env
ADMIN_EMAILS=admin@example.com
```

Then restart Next.js.

## Community Actions

Voting, commenting, reporting, and saving are implemented through server actions in:

```text
app/actions.ts
```

Important behavior:

- Anonymous voters receive a long-lived viewer cookie.
- A viewer can have only one active vote per deal.
- Vote changes and deal score updates run in one backend transaction.
- Duplicate votes, reports, and saved deals are protected by database constraints.
- Comments support replies, likes, and deletion by their author.
- Signed-in users can save deals and view them from `/profile`.
- Voting, commenting, and reporting include basic abuse rate limiting.
- Signed-in users can follow public member profiles when that member allows followers.

Database migrations for uniqueness constraints are stored in:

```text
backend/database/migrations/
```

## Deal Expiration

Deals can include an expiration date. Public queries hide expired deals, while admins can manually mark a deal as expired.

The homepage and deal cards display expiration status through:

```text
components/ExpirationTime.tsx
```

## Account Settings and Profiles

Signed-in users manage profile and preference data at `/settings`.

Settings include:

- Avatar, public username, and short bio
- Light, dark, or system theme preference
- Notification preference toggles
- Privacy toggles for public profile visibility, join date, activity stats, saved deals, and followers

Profile settings are stored in the Strapi `User Setting` content type and handled by:

```text
app/settings/page.tsx
app/settings/actions.ts
lib/userSettings.ts
backend/src/api/user-setting/content-types/user-setting/schema.json
```

Public profiles are available at `/profile/[userId]`, where `[userId]` can resolve from a profile username or fallback user identity. Follow relationships are stored in the Strapi `Follow` content type.

## Public Routes

Main application routes:

```text
/             Deal feed and rankings
/post         Submit a deal
/deal/[id]    Deal details, voting, comments, saving, and reporting
/auth         Register or log in
/profile      Posted deals, saved deals, comments, and account details
/profile/[id] Public member profile
/settings     Account profile, appearance, notification, privacy, and security settings
/admin        Moderation dashboard
```

Information and policy routes:

```text
/about
/affiliate-disclosure
/community-rules
/contact
/privacy
/terms
```

SEO routes are generated by `app/sitemap.ts` and `app/robots.ts`.

## Useful Commands

From project root:

```powershell
npm.cmd run dev
npm.cmd run build
npm.cmd run lint
npm.cmd run typecheck
npm.cmd run verify
npm.cmd run backend:dev
npm.cmd run backend:build
```

From `backend/`:

```powershell
npm.cmd run dev
npm.cmd run build
npm.cmd run start
```

## Operational Readiness Checks

Run these before handing a build to another person or deploying:

```powershell
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run build
npm.cmd run backend:build
```

Or run the combined root check:

```powershell
npm.cmd run verify
```

Expected result:

- Next.js compiles successfully.
- TypeScript passes for the frontend app.
- ESLint passes for committed frontend/shared code.
- Strapi compiles TypeScript and builds the admin panel.

Operational notes:

- Start Strapi before testing dynamic frontend flows that need data.
- Keep `STRAPI_API_TOKEN`, `APP_KEYS`, `JWT_SECRET`, and database credentials out of Git.
- Use PostgreSQL for shared, staging, and production environments. SQLite is only for local single-developer use.
- Strapi database migrations in `backend/database/migrations/` are additive and idempotent where practical. They run through Strapi's migration system when the backend starts against a database that has not recorded them.
- Schedule production migration runs during a quiet window. Index creation can briefly lock large tables depending on the database provider.
- After deployment, smoke-test `/`, `/post`, `/auth`, `/profile`, `/settings`, `/admin`, and one `/deal/[id]` page.

## Testing Strategy

There is currently no unit or end-to-end test framework configured for this repository. Playwright is installed because the product metadata scraper uses it at runtime; it is not yet wired as an app test runner.

Recommended staged test setup:

1. Add a lightweight unit test runner such as Vitest for pure helpers in `lib/`, starting with Strapi response parsing, URL safety, description sanitization, moderation validation, and account settings normalization.
2. Add server-action unit or integration tests around posting validation, vote/report/save duplicate handling, comment validation, and admin authorization checks.
3. Add Playwright end-to-end smoke tests after test data setup is reliable: auth, post deal, vote, save, comment, report, admin moderation, profile/settings refresh.
4. Run tests in CI with PostgreSQL for backend flows so migration and uniqueness behavior matches production more closely than SQLite.

## Reset Local Strapi Content

To clear deals, comments, votes, reports, saved deals, follows, user settings, categories, and website users while keeping Strapi structure/admin setup:

Dry run:

```powershell
node scripts\clear-strapi-content.mjs
```

Apply:

```powershell
node scripts\clear-strapi-content.mjs --apply
```

This does not delete Strapi content type schemas.

## Common Issues

PowerShell blocks `npm`:

```powershell
npm.cmd run dev
```

Strapi is not running:

```text
Could not connect to Strapi.
```

Fix:

```powershell
npm.cmd run backend:dev
```

Playwright missing browser:

```text
browserType.launch: Executable doesn't exist
```

Fix:

```powershell
npx.cmd playwright install chromium
```

Deal saved but not showing on homepage:

Check that the deal has:

```text
moderationStatus = approved
isExpired = false
```

Also prefer approving from:

```text
http://localhost:3000/admin
```

Strapi email confirmation error:

Email verification requires a configured Strapi email provider. It is disabled for now.

## Production Direction

Recommended live architecture:

```text
Next.js frontend -> Vercel
Strapi backend -> Railway / Render / Strapi Cloud
Database -> PostgreSQL, such as Neon / Supabase / Railway Postgres
```

Do not use local SQLite for production.

For production Strapi:

- Configure PostgreSQL.
- Configure real email provider if enabling email verification.
- Set public backend URL.
- Set frontend `STRAPI_URL` to the deployed Strapi URL.
- Store secrets in hosting environment variables, not in Git.
