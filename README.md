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
- Shared development and live Strapi database: PostgreSQL through `pg`
- Optional throwaway local database: SQLite through `better-sqlite3` `12.8.0`

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
- Threaded comments with likes, inline owner editing, edited indicators, and ownership-based deletion
- Deal reporting with duplicate-report and rate-limit protection
- Comment reporting with reasons, rate limits, database-backed duplicate protection, and admin visibility
- Saved deals for signed-in users
- Keyboard-accessible member autocomplete with live result announcements and complete loading, empty, and API-error states
- Paginated profile activity for posted deals, saved deals, complete comment history, vote stats, and follow counts
- Owner editing for submitted deals with full validation and moderation resubmission
- Browser-local deal drafts with refresh recovery and unsaved-navigation warnings
- Public member profiles with profile privacy controls and follow/unfollow support
- Complete follower and following lists on the signed-in member's own profile, with private profiles kept non-navigable
- Automatic profile creation when a website account is registered
- Account settings for avatar, editable display name, permanent `@username`, bio, theme, notifications, and privacy preferences
- Admin moderation for deals, reports, comments, and users
- Focus-trapped application dialogs before destructive deal and comment deletion
- Keyboard-accessible member autocomplete, skip navigation, larger interaction targets, and field-specific authentication errors
- Sitemap, robots rules, canonical metadata, and Open Graph branding
- About, contact, privacy, terms, community rules, and affiliate disclosure pages

## Partner AI Setup Summary

Use this section if an AI assistant is setting up the project on another computer.

Important:

- Do not commit `.env.local` or `backend/.env`.
- If this computer should use the existing project data, copy the existing `backend/.env` from the project owner or previous machine.
- Ask the project owner privately for `DATABASE_URL`, Strapi secret values, and `STRAPI_API_TOKEN`.
- The frontend runs from the project root.
- The Strapi backend runs from `backend/`.
- Local development can use the shared Neon PostgreSQL database through `DATABASE_URL`.
- Use SQLite only for throwaway local testing. A new SQLite file is empty, so Strapi will ask for a new admin profile.

Setup order:

1. Install Node.js `24.x`.
2. Run `npm install` in the project root.
3. Run `npm install` inside `backend/`.
4. Create `backend/.env` by copying the existing project env file, or use the PostgreSQL template in this README with the real `DATABASE_URL` and Strapi secrets.
5. Start Strapi with `npm run backend:dev`.
6. Open `http://localhost:1337/admin`.
7. Log in to the existing Strapi admin account. If Strapi asks you to create a new admin profile, stop and check that `backend/.env` points at the existing PostgreSQL database.
8. Create a Strapi API token.
9. Create `.env.local` using the template in this README.
10. Start Next.js with `npm run dev`.
11. Open `http://localhost:3000`.

On Windows PowerShell, replace `npm` and `npx` with `npm.cmd` and `npx.cmd` if script execution policy blocks the default commands.

## Project Structure

```text
DRBuild-01/
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

```bash
npm install
```

Install Strapi backend dependencies:

```bash
cd backend
npm install
```

Return to the root:

```bash
cd ..
```

Install Playwright Chromium for the product scraper:

```bash
npx playwright install chromium
```

## Environment Variables

These files are intentionally ignored by Git:

```text
.env.local
backend/.env
```

Create this frontend env file:

```text
DRBuild-01/.env.local
```

Template:

```env
STRAPI_URL=http://127.0.0.1:1337
STRAPI_API_TOKEN=paste_your_strapi_api_token_here
CF_ACCESS_CLIENT_ID=
CF_ACCESS_CLIENT_SECRET=
ADMIN_EMAILS=local@example.com
NEXT_PUBLIC_SITE_URL=http://localhost:3000
SITE_ACCESS_PIN=
SITE_ACCESS_SECRET=
```

Notes:

- `STRAPI_URL` points the Next.js frontend to Strapi.
- `STRAPI_API_TOKEN` must be created in Strapi Admin.
- `CF_ACCESS_CLIENT_ID` and `CF_ACCESS_CLIENT_SECRET` are an optional Cloudflare Access service-token pair for server-to-server Strapi requests. Configure both or neither, keep them unprefixed and server-only, and never expose them to browser code.
- `ADMIN_EMAILS` is the website user email allowed to open `/admin`.
- `ADMIN_EMAILS` is not the Strapi admin email unless the same email is also used for the website login.
- `NEXT_PUBLIC_SITE_URL` is used for canonical and sitemap URLs. Set it to the deployed frontend origin in production.
- `SITE_ACCESS_PIN` optionally enables the private preview gate. It must be 12-128 characters; use a unique random value of at least 16 characters rather than a short numeric PIN.
- `SITE_ACCESS_SECRET` signs the 15-minute HTTP-only access cookie and must be a random value at least 32 characters long. Keep it server-only.
- Leave both site-access values empty for ordinary local development. Removing `SITE_ACCESS_PIN` and redeploying disables the gate for public launch.

Create this backend env file:

```text
DRBuild-01/backend/.env
```

For an existing project database, copy the existing `backend/.env` from the project owner or previous machine. This preserves the database connection and Strapi secrets. If you cannot copy it, use this Neon PostgreSQL template and fill in the real values:

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
DATABASE_URL=postgresql://user:password@host/database?sslmode=verify-full
DATABASE_SSL=true
DATABASE_SSL_REJECT_UNAUTHORIZED=true
DATABASE_SCHEMA=public
DATABASE_POOL_MIN=2
DATABASE_POOL_MAX=10
DATABASE_CONNECTION_TIMEOUT=60000

# Optional, only used if email verification is enabled later
FRONTEND_URL=http://localhost:3000/auth?message=email-confirmed
```

If the owner gives you an existing `backend/.env`, use that instead of generating new Strapi secret values. Do not replace an existing project database with SQLite unless you intentionally want a blank local Strapi instance.

For throwaway local SQLite instead of Neon PostgreSQL, use:

```env
DATABASE_CLIENT=sqlite
DATABASE_FILENAME=.tmp/data.db
```

If `DATABASE_URL` is not set, Strapi falls back to local SQLite at `backend/.tmp/data.db`. That file starts empty, so Strapi will ask you to create a new admin profile and it will not show the shared project data.

## Running Locally

Use two terminals.

Terminal 1, start Strapi:

```bash
npm run backend:dev
```

Open Strapi admin:

```text
http://localhost:1337/admin
```

Log in with the existing Strapi admin account. Create the first Strapi admin only when intentionally connecting to a new blank database.

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

```bash
npm run dev
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
DATABASE_SSL_REJECT_UNAUTHORIZED=true
```

Important:

- Local SQLite data is not automatically moved to Neon.
- When Strapi first connects to a fresh Postgres database, it creates the required tables.
- A fresh PostgreSQL database needs a new Strapi admin user. An existing shared database keeps its existing admin users and content.
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
- Comments support replies, likes, inline owner editing, an edited indicator, and ownership-checked deletion.
- Profile comment history exhausts backend pagination and links available records to the relevant discussion; missing, rejected, pending, and expired deals are labelled honestly.
- Deal owners can edit submissions from their profile. The form preserves the saved category and subcategory instead of re-scraping or auto-classifying an existing deal; the server rechecks ownership and validation, non-admin edits return to pending moderation, and admin-owner edits preserve their current status.
- Account deactivation and deletion controls are intentionally withheld with honest settings copy until their complete first-party identity and data-retention workflows are implemented.
- Comment reports are stored separately from comments. A unique report key prevents the same viewer from reporting one comment twice, while moderation shows report counts and distinct reasons; successful moderation actions refresh the server-derived dashboard totals as well as the affected table row.
- Comment and reply forms show live character counts, warn before page unload, preserve closed reply drafts, surface like failures, and use focus-restoring application dialogs instead of native browser confirmations.
- Comment deletion removes the selected subtree deepest-first, cleans associated report records, and then resynchronizes the stored deal comment count; focused tests cover ordering and corrupt-cycle safety.
- Concurrent identical comment submissions are rejected by a private account/viewer-scoped SHA-256 key with a database unique index, in addition to friendly preflight duplicate feedback.
- Deal posting and editing save bounded, account-scoped drafts in the current browser for up to 30 days, restore them after refresh, warn on reload or in-app navigation, and clear saved data after submission or confirmed discard.
- Deal images show a processing state, retain actionable failures, support same-file retry after processing errors, and expose removal controls for every selected image.
- Public Terms, Privacy, Community Rules, Affiliate Disclosure, About, and Contact pages describe current first-party behavior without draft labels or fake addresses. General support and privacy requests use `support@dealrakyat.my`; formal takedown and legal notices use `legal@dealrakyat.my`.
- Password change/recovery and destructive account actions are not presented as working controls while those out-of-scope identity workflows are unavailable.
- Signed-in users can save deals and view them from `/profile`.
- Voting, commenting, and reporting include basic abuse rate limiting.
- Signed-in users can follow public member profiles when that member allows followers.

Database migrations for uniqueness constraints are stored in:

```text
backend/database/migrations/
```

The current profile migrations rename legacy profile fields, repair duplicate User Setting rows, and add ownership fields before enforcing one profile per website user. Comment editing adds a nullable `edited_at` timestamp so likes and other record updates do not incorrectly display the edited indicator.

## Deal Expiration

Deals can include an expiration date. Public queries hide expired deals, while admins can manually mark a deal as expired.

The homepage and deal cards display expiration status through:

```text
components/ExpirationTime.tsx
```

## Account Settings and Profiles

Signed-in users manage profile and preference data at `/settings`.

Settings include:

- Avatar, editable display name, permanent public `@username`, and short bio
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

Each Users & Permissions website user has exactly one `User Setting` profile. Strapi creates it automatically after account creation and backfills missing profiles when the backend starts. Database constraints and repair migrations prevent duplicate profiles for the same user.

Profile identity fields have distinct purposes:

```text
displayName    Editable name shown on profiles, posts, and comments.
username       Permanent unique public handle, displayed as @username.
ownerUsername  Internal link to the Strapi Users & Permissions username.
ownerEmail     Internal ownership reference used by Strapi administration.
```

The Strapi User Setting list is configured to show user ID, username, display name, owner username, and owner email so administrators can identify the account behind each profile.

Public profiles are available at `/profile/[userId]`, where `[userId]` can resolve from a profile username or fallback user identity. The global search bar queries public usernames and display names, then links matching members directly to their profiles. Follow relationships are stored in the Strapi `Follow` content type.

## Public Routes

Main application routes:

```text
/             Deal feed and rankings
/post         Submit a deal
/deal/[id]    Deal details, voting, comments, saving, and reporting
/deal/[id]/edit  Owner-only deal editing; non-admin changes return to moderation
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

```bash
npm run dev
npm run frontend:dev
npm run build
npm run lint
npm run typecheck
npm test
npm run verify
npm run backend:dev
npm run backend:build
npm run db:check
```

From `backend/`:

```bash
npm run dev
npm run build
npm run start
```

## Operational Readiness Checks

Run these before handing a build to another person or deploying:

```bash
npm run typecheck
npm run lint
npm test
npm run build
npm run backend:build
```

Or run the combined root check:

```bash
npm run verify
```

Expected result:

- Next.js compiles successfully.
- TypeScript passes for the frontend app.
- ESLint passes for committed frontend/shared code.
- Focused Node tests pass for comment validation and ownership authorization.
- Strapi compiles TypeScript and builds the admin panel.

Operational notes:

- Start Strapi before testing dynamic frontend flows that need data.
- Production Strapi refuses to start without an explicit PostgreSQL `DATABASE_URL`; it will not silently create a SQLite database.
- Keep `STRAPI_API_TOKEN`, `APP_KEYS`, `JWT_SECRET`, and database credentials out of Git.
- Use PostgreSQL for shared, staging, and production environments. SQLite is only for local single-developer use.
- Strapi database migrations in `backend/database/migrations/` are additive and idempotent where practical. They run through Strapi's migration system when the backend starts against a database that has not recorded them.
- Schedule production migration runs during a quiet window. Index creation can briefly lock large tables depending on the database provider.
- After deployment, smoke-test `/`, `/post`, `/auth`, `/profile`, `/settings`, `/admin`, and one `/deal/[id]` page.

Run the read-only PostgreSQL readiness audit after Strapi has started once and applied migrations:

```bash
npm run db:check
```

It verifies required tables and indexes, duplicate votes/reports/saves/follows/profiles, missing or orphaned user profiles, and the Strapi migration table. It never modifies database content.

## Testing Strategy

### Mobile and Safari readiness

The first-party interface uses dynamic viewport units with legacy fallbacks, safe-area-aware full-screen menus and dialogs, internally scrollable modal content, and 16px mobile form controls to avoid Safari focus zoom. Repeated compact actions expand to at least 44px on touch-first devices without changing their desktop presentation. Admin deal and comment moderation stay in the labelled stacked layout through tablet widths and switch to dense columns at 1024px.

Responsive browser QA should cover 320px, 360px, 390px, 430px, 768px, landscape mobile, and desktop widths in both themes. Check navigation and search overlays, posting and rich-text selection, image inputs, comment dialogs, profile pagination and follow controls, settings, and all moderation rows. Include software-keyboard behavior, long unbroken content, reduced motion, 200% text zoom, focus restoration, and browser/server console errors.

The 13 July 2026 production-browser audit covered every first-party public and authenticated route at 320px, 360px, 390px, 430px, 768px, 740×360 landscape, and 1280px desktop. It also covered the public member profile, light and dark themes, a 200% reflow approximation, keyboard member search, mobile-menu scrolling and focus return, short-landscape confirmation dialogs, reduced-height posting, stacked tablet moderation, loading states, and temporary-draft cleanup. The audited routes had no unintended page-level horizontal overflow or related browser-console errors. Final release QA should still include one pass on physical iOS Safari and Android Chrome for real safe-area, software-keyboard, file-picker, touch-pointer, and browser-zoom behavior that desktop emulation cannot reproduce exactly.

Focused pure-helper regression tests use Node's built-in test runner and run with `npm test`. They currently cover comment validation boundaries, ownership, duplicate-submission keys and create-response relation fallback, safe comment-tree deletion, deal-description limits, revision-aware edit drafts, and preservation of stored deal categories during editing. Playwright is installed because the metadata scraper uses it at runtime; repeatable automated authenticated E2E tests still need a dedicated isolated user/database fixture.

Recommended staged test setup:

1. Expand pure-helper coverage to Strapi response parsing, URL safety, description sanitization, moderation validation, and account settings normalization.
2. Add server-action integration tests around posting validation, vote/report/save duplicate handling, and admin authorization checks.
3. Add Playwright end-to-end smoke tests after test data setup is reliable: auth, post/edit deal, vote, save, edit/report comment, admin moderation, and profile/settings refresh.
4. Run integration tests in CI with PostgreSQL so migration and uniqueness behavior matches production more closely than SQLite.

## Reset Local Strapi Content

To clear deals, comments, votes, reports, saved deals, follows, user settings, categories, and website users while keeping Strapi structure/admin setup:

Dry run:

```bash
node scripts/clear-strapi-content.mjs
```

Apply:

```bash
node scripts/clear-strapi-content.mjs --apply
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

User Setting is missing, duplicated, or difficult to identify in Strapi Admin:

1. Confirm Strapi is connected to the intended PostgreSQL database.
2. Restart Strapi so bootstrap profile repair and Content Manager column configuration run.
3. Check that the migration files in `backend/database/migrations/` are present and recorded by the target database.
4. Do not manually create another User Setting row for the same `userId`; account creation and backend bootstrap manage these profiles automatically.

## Production Direction

Recommended live architecture:

```text
Cloudflare DNS
├── dealrakyat.my -> Vercel -> Next.js
├── api.dealrakyat.my -> Railway -> Strapi -> Neon PostgreSQL
└── media.dealrakyat.my -> Cloudflare R2
```

Do not use local SQLite for production.

For production Strapi:

- Configure PostgreSQL.
- Configure real email provider if enabling email verification.
- Set public backend URL.
- Set frontend `STRAPI_URL` to the deployed Strapi URL.
- Store secrets in hosting environment variables, not in Git.

## Production Deployment

Deploy the backend first so the frontend can use its public URL. Keep all secrets in provider environment variables and never commit them.

### 1. Strapi on Railway

Create one Railway service connected to this GitHub repository:

- Root Directory: `/backend`
- Config File Path: `/backend/railway.json`
- Generate a temporary Railway domain before configuring the frontend.

Set these variables using existing production values where applicable:

```text
NODE_ENV=production
HOST=0.0.0.0
PUBLIC_URL=https://<temporary-strapi-domain>.up.railway.app
IS_PROXIED=true
FRONTEND_URL=https://dealrakyat.my/auth?message=email-confirmed
DATABASE_CLIENT=postgres
DATABASE_URL=<existing Neon connection string>
DATABASE_SSL=true
DATABASE_SSL_REJECT_UNAUTHORIZED=true
DATABASE_SCHEMA=public
APP_KEYS=<existing four comma-separated keys>
API_TOKEN_SALT=<existing value>
ADMIN_JWT_SECRET=<existing value>
TRANSFER_TOKEN_SALT=<existing value>
ENCRYPTION_KEY=<existing value>
JWT_SECRET=<existing value>
R2_ENDPOINT=https://<cloudflare-account-id>.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=<bucket-scoped access key>
R2_SECRET_ACCESS_KEY=<bucket-scoped secret key>
R2_BUCKET=deal-rakyat-uploads
R2_PUBLIC_URL=https://media.dealrakyat.my
```

Do not generate replacement Strapi secrets when connecting the existing database. Changing these values can invalidate sessions, tokens, or encrypted application data.

`R2_ENDPOINT` enables the S3-compatible upload provider. When it is absent, local development continues to use Strapi's local upload provider. Production must use R2 because Railway service filesystems are ephemeral.

After Strapi is healthy, open its `/admin` page and create or confirm the production API token. Copy it into Vercel as `STRAPI_API_TOKEN`; it is not a public browser variable.

### 2. Next.js on Vercel

Import the same repository into Vercel. Keep the project root at `/`; Vercel detects and builds Next.js directly.

Set these Vercel variables:

```text
STRAPI_URL=https://<temporary-strapi-domain>.up.railway.app
STRAPI_API_TOKEN=<production Strapi API token>
CF_ACCESS_CLIENT_ID=<Cloudflare Access service-token client ID>
CF_ACCESS_CLIENT_SECRET=<Cloudflare Access service-token client secret>
ADMIN_EMAILS=<comma-separated website admin emails>
NEXT_PUBLIC_SITE_URL=https://dealrakyat.my
SITE_ACCESS_PIN=<unique random preview code, 12-128 characters>
SITE_ACCESS_SECRET=<random value at least 32 characters long>
```

`NEXT_PUBLIC_SITE_URL` is a build-time public variable, so redeploy the frontend after changing it. Keep `STRAPI_API_TOKEN`, `CF_ACCESS_CLIENT_ID`, and `CF_ACCESS_CLIENT_SECRET` unprefixed so they are never included in browser bundles. The Cloudflare pair must be configured together; leave both empty when the Strapi hostname is not protected by Access.

While the site is under development, set both `SITE_ACCESS_PIN` and `SITE_ACCESS_SECRET` for the Production environment. The frontend then serves a JavaScript-free generic gate before any application page or asset, protects frontend API and health routes, issues a signed 15-minute HTTP-only cookie after a correct code, and sends restrictive cache, indexing, framing, referrer, and content-security headers. Redeploy after adding or removing these variables. Keep the Vercel frontend DNS records in Cloudflare set to **DNS only**; Cloudflare Access requires proxying and is not used in this architecture.

### 3. Cloudflare R2 uploads

Create the `deal-rakyat-uploads` bucket, issue a Read & Write S3 API token restricted to that bucket, and connect `media.dealrakyat.my` as its public custom domain. Do not use the rate-limited `r2.dev` URL in production. The R2 token belongs only in Railway.

Add an R2 bucket CORS rule allowing `GET` from the production Strapi origin (`https://api.dealrakyat.my`). Add the temporary Railway origin during smoke testing if needed, then remove it after the custom API domain is live.

After deployment, upload, view, and delete a disposable image through Strapi Media Library. Confirm its stored URL starts with `https://media.dealrakyat.my/` and remains available after a Railway redeploy.

Deal submissions upload user-selected product photos through the server-side Strapi `/api/upload` endpoint. Strapi stores the files in Media Library/R2, while the deal record stores the returned public URLs and a private `uploadedMediaFiles` cleanup list. The frontend API token must permit Upload `upload` and `destroy` actions in addition to the required Deal actions; the token is never sent to the browser. Deploy the Railway/Strapi service before the matching Vercel frontend so the optional `uploadedMediaFiles` deal field exists before submissions begin.

When running the frontend against local Strapi, uploads use whichever provider is configured in `backend/.env`. Do not point local Strapi at the production database while leaving uploads on local disk: that creates shared media records whose files Railway cannot access. Either configure the same R2 variables locally for this temporary shared-data workflow or set the local frontend `STRAPI_URL` to `https://api.dealrakyat.my` so uploads pass through production Strapi/R2.

### 4. Domains and final linking

Smoke-test the temporary Vercel and Railway domains before changing production DNS.

1. Add `dealrakyat.my` and `www.dealrakyat.my` to Vercel. Add Vercel's exact A/CNAME records in Cloudflare and keep those records **DNS only**. Configure one hostname to redirect to the other.
2. Add `api.dealrakyat.my` to Railway. Add both the CNAME and TXT verification records Railway supplies. If Cloudflare proxying is enabled for this API hostname, use SSL/TLS mode **Full** as required by Railway.
3. Connect `media.dealrakyat.my` from the R2 bucket's Custom Domains settings; let Cloudflare create its managed DNS record.
4. Change Railway `PUBLIC_URL` to `https://api.dealrakyat.my`.
5. Set Vercel `STRAPI_URL` to the proxied Strapi hostname. If that hostname is protected by Cloudflare Access, create a Service Auth policy for Vercel's service token and configure both `CF_ACCESS_CLIENT_ID` and `CF_ACCESS_CLIENT_SECRET`; all server-side Strapi reads, authentication calls, and media operations send those credentials. Keep Railway `PUBLIC_URL` on the same public Strapi hostname.
6. Run `npm run db:check` against the production backend variables.
7. Smoke-test `/`, `/auth`, `/post`, `/profile`, `/settings`, `/admin`, `/api/health`, one deal page, and the upload lifecycle.

Keep Neon in place. Moving PostgreSQL is a separate data-migration project and is not required for this deployment.
