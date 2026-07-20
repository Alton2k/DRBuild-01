# Deal Rakyat TODOs

This file is the shared reference for project TODOs agreed during development.
Update an existing item instead of duplicating it, and move completed work to
the completed section with its completion date.

## Active

Active items are ordered from easier to harder based on their current scope,
dependencies, external approvals, and verification requirements.

Priority labels for external follow-up:

- **P0 — Before public launch or feature enablement:** Security, legal, privacy, and abuse-prevention decisions that gate a safe release or a sensitive account capability.
- **P1 — Release assurance:** Physical-device, production-performance, image-delivery, and isolated integration verification needed to validate the release under real conditions.
- **P2 — Optional operational capability:** Provider setup required before enabling email-dependent features.
- **P3 — Deferred growth work:** Social login, affiliate monetisation, and product-data integrations to revisit only after the core website is public and the required accounts and permissions are approved.

### Verify the responsive marketplace on physical devices and in production

- Status: Pending external and production verification
- Priority: P1 — Release assurance
- Added: 2026-07-15
- Updated: 2026-07-21
- Depends on: Completed responsive marketplace implementation recorded below.
- Goal: Validate the completed responsive experience under real mobile hardware, production traffic, and production image delivery.
- Completion criteria:
  - Test the deployed workflows on physical iOS Safari and Android Chrome, including login, search, menus, voting, saving, posting, file selection, software keyboards, touch, safe areas, rotation, zoom, and light/dark themes.
  - Measure production Core Web Vitals after public deployment, targeting LCP at or below 2.5 seconds, INP at or below 200 milliseconds, and CLS at or below 0.1 at the 75th percentile for mobile and desktop.
  - Select and validate a trusted responsive-image transformation pipeline that generates genuine `srcset` variants for arbitrary user media before image traffic scales.

### Activate PostgreSQL password throttling in the deployed backend

- Status: Repository implementation complete; deployment configuration pending
- Priority: P0 — Required before treating password throttling as production-ready
- Added: 2026-07-21
- Goal: Activate the completed distributed limiter without bypassing the normal reviewed migration and deployment process.
- Completion criteria:
  - Set a dedicated random `PASSWORD_RATE_LIMIT_SECRET` of at least 32 bytes in the Next.js and backend server environments and use the same value on every instance.
  - Deploy the backend normally so Strapi applies `2026.07.21T100000.add-password-rate-limits.js`; do not run the migration manually against production.
  - Verify generic password-change failure and `Retry-After` behaviour without logging or storing raw account identifiers, IP addresses, credentials, or authentication secrets.

### Verify administrator and account workflows on physical devices

- Status: Repository integration coverage complete; physical-device release QA pending
- Priority: P1 — Release assurance
- Added: 2026-07-15
- Updated: 2026-07-21
- Depends on: Completed admin redesign, account settings, and isolated action fixtures recorded below.
- Goal: Verify the completed sensitive workflows under real browser, input, and hardware conditions.
- Completion criteria:
  - Complete administrator workflow checks on physical mobile hardware and desktop in light and dark themes, including keyboard-only navigation, visible focus, loading, empty, filtered, error, success, and destructive-confirmation states.

### Complete account security policy and email-dependent capabilities

- Status: Blocked on account-lifecycle policy and email-provider decisions
- Priority: P0 for account deletion prerequisites; P2 for email-dependent features
- Added: 2026-07-15
- Updated: 2026-07-21
- Goal: Enable the remaining account lifecycle and email capabilities only after their security and operational prerequisites are approved.
- Completion criteria:
  - Before enabling account deactivation or deletion, adopt revocable sessions or refresh tokens and decide recent-authentication proof, retention and legal holds, content anonymisation, recovery windows, and administrator audit policy.
  - Configure an approved email provider and required environment variables before enabling forgotten-password recovery, email-address changes, weekly summaries, or marketing email.
  - Add ownership verification, consent, unsubscribe, rate-limit, failure-recovery, and audit controls appropriate to each enabled email workflow.

### Add optional connected-account sign-in

- Status: Deferred
- Priority: P3 — Deferred until after the core website is public
- Added: 2026-07-15
- Goal: Add Google or another approved identity provider later while keeping Strapi users and credentials in PostgreSQL as the primary account system.
- Completion criteria:
  - Keep existing email/password registration and user records in Strapi's PostgreSQL database; do not replace or migrate them to a provider-owned user store.
  - Add Google sign-up and sign-in only after the core website and first-party account workflows are ready.
  - Link a provider identity to the correct existing account through a verified email or an explicit signed-in connection flow, and prevent duplicate accounts or automatic linking based on unverified claims.
  - Preserve the same Deal Rakyat user ID, profile, deals, comments, votes, saved deals, follows, settings, moderation history, and administrator authorization regardless of sign-in method.
  - Store provider subject identifiers and tokens securely, request the minimum scopes, document account unlinking and provider failure behavior, and retain a first-party login or recovery path.
  - Add tests for new-provider registration, existing-account linking, duplicate email handling, cancelled consent, revoked access, provider outage, unlinking, and authorization boundaries.

### Implement approved affiliate-link routing

- Status: Deferred
- Priority: P3 — Deferred until after the core website is public and publisher accounts are approved
- Added: 2026-07-15
- Goal: Monetize eligible user-submitted merchant links without blocking or rewriting unsupported links incorrectly.
- Completion criteria:
  - Obtain approval for the relevant publisher property before generating affiliate links, prioritizing direct programs for Shopee, Lazada, and Amazon where available.
  - Evaluate Involve Asia for Malaysian merchants and Skimlinks or Sovrn Commerce as the long-tail aggregator; verify actual merchant coverage and user-generated-content permission in each approved account before integration.
  - Maintain an explicit merchant-domain registry and normalize redirects safely before selecting an affiliate provider.
  - Give approved direct programs priority, prevent double wrapping, and preserve the original ordinary link when no eligible program exists, including Machines, Mudah, Carlist, Mercari, or any other unsupported merchant.
  - Clearly disclose affiliate monetization beside eligible links and in the Terms of Use, including that Deal Rakyat may convert submitted outbound links and may earn a commission at no additional cost to the user.
  - Keep affiliate permission separate from content rights; an affiliate link must not be treated as permission to scrape, copy, or permanently store merchant text or images.
  - Document provider rules, permitted traffic sources, deep-link restrictions, commission validation, privacy implications, link-removal requirements, and fallback behavior.
  - Add tests for domain lookalikes, redirects, shortened URLs, malformed URLs, existing affiliate parameters, unsupported merchants, provider outages, disclosure rendering, and ordinary-link fallback.

### Build a rights-aware product-data integration

- Status: Deferred
- Priority: P3 — Deferred until approved feeds, field rights, and image permissions exist
- Added: 2026-07-15
- Updated: 2026-07-16
- Deferral reason: Scraping and automated product-data assistance remain out of scope until the website is finished and approved merchant or affiliate accounts provide documented field and image rights. The complete manual submission and permitted user-upload fallback remains available.
- Goal: Reintroduce optional product-data assistance only through approved, rights-aware sources.
- Completion criteria:
  - Use only approved merchant or affiliate APIs and feeds with documented rights for each imported field and image.
  - Keep permitted user uploads as the primary manual image path, with server-side validation and durable Strapi/R2 storage.
  - Preserve a complete non-affiliate fallback where users manually enter the product link, title, merchant, price, description, and permitted image.
  - Document source attribution, retention, refresh, takedown, and merchant opt-out behavior before enabling any integration.
  - Add tests for authorization, source allowlisting, malformed or stale feed data, duplicate submissions, missing data, and fallback behavior.

### Complete pre-public-launch legal readiness

- Status: Blocked on external legal and business decisions
- Priority: P0 — Required before public registration and user posting
- Added: 2026-07-15
- Updated: 2026-07-16
- Repository progress:
  - Existing repository pages provide draft Terms, Community Rules, Privacy, contact, reporting, moderation, takedown, affiliate, and merchant-independence information, plus deal/comment reporting and admin review controls.
  - Completion requires Malaysian ecommerce/privacy/copyright counsel, operating-entity and SSM details, monitored public contact ownership, retention and escalation decisions, DPO assessment, tax preparation, and final pre-launch testing. Repository copy must not be represented as lawyer-reviewed until that review occurs.
- Goal: Resolve Deal Rakyat's Malaysian legal classification and establish the minimum compliance controls required before public registration and user posting are enabled.
- Completion criteria:
  - Obtain Malaysian ecommerce counsel's written view on whether Deal Rakyat is an online marketplace operator under the Consumer Protection (Electronic Trade Transaction) Regulations 2024, including which supplier disclosures, complaint channels, advertisement controls, and three-year records are required for community-posted third-party deals.
  - Publish lawyer-reviewed Terms of Use, Community Rules, Privacy Notice, acceptable-use rules, merchant-independence disclaimer, and price, voucher, shipping, availability, and expiry disclosures without attempting to waive statutory consumer rights.
  - Implement accessible reporting and documented escalation for deals, comments, accounts, scams, counterfeit or unsafe goods, defamatory allegations, personal information, and other unlawful content; retain proportionate moderation evidence and suspend repeat offenders.
  - Publish an accessible copyright contact and compliant notice-and-takedown procedure, record the uploader and rights declaration for every image, and define the disputed-content and repeat-infringer processes required to rely on applicable Copyright Act protections.
  - Complete a PDPA review covering data inventory, lawful purposes, minimisation, access and correction, deletion and retention, processors, cross-border transfers, security, analytics and cookies, and a 72-hour breach-notification response plan.
  - Assess and document whether Deal Rakyat meets a mandatory DPO condition through data-subject volume, sensitive or financial data, or regular and systematic monitoring.
  - Block or require specialist approval for high-risk categories at launch, including medicines and health claims, alcohol, tobacco or vape products, weapons, gambling, financial or investment schemes, adult services, counterfeit goods, recalled goods, and unsafe products.
  - Confirm the operating entity, SSM registration and public business contact details, and prepare tax recordkeeping for any future advertising, sponsorship, or affiliate income.
  - Test reporting, takedown, account suspension, image removal, deal expiry, privacy requests, restricted-category enforcement, audit records, and breach-response access before public launch.
- Research references:
  - [KPDN Electronic Trade Transaction Regulations 2024](https://repositori.kpdn.gov.my/bitstream/123456789/5299/1/PERATURAN%20URUSNIAGA%20PERDAGANGAN%20DALAM%20ELEKTRONIK%202024.pdf)
  - [Malaysia Copyright Act 1987](https://www.myipo.gov.my/wp-content/uploads/2025/02/Lampiran-A1-ENG-Akta-Hak-Cipta-setakat-22-Jun-2023.pdf)
  - [Personal Data Protection Commissioner guidance](https://www.pdp.gov.my/ppdpv1/en/akta/application-and-non-application-of-the-act/)
  - [Malaysian Communications and Multimedia Content Code](https://contentforum.my/content-code/)
  - [Ministry of Health medicine-advertising guidance](https://www.pharmacy.gov.my/v2/sites/default/files/document-upload/latest-guideline-advertising-medicines-and-medicinal-products-general-public.pdf)
  - [SSM business registration](https://www.ssm.com.my/Pages/Services/Registration-of-Business-%28ROB%29/EzBiz-Online.aspx)
  - [LHDN digital-business guidance](https://www.hasil.gov.my/en/company/digital-business/)

## Completed

### Implement distributed PostgreSQL password-change throttling

- Status: Completed
- Added: 2026-07-21
- Completed: 2026-07-21
- Outcome:
  - Kept Strapi's existing password hashing, PostgreSQL user storage, current-password verification, and session refresh behaviour.
  - Wrapped Strapi's authenticated change-password controller so callers cannot bypass the limiter by calling the backend directly; the account identity comes only from the authenticated server context.
  - Added a short-lived account-bound HMAC proof so Next.js can forward the member IP without allowing direct callers to spoof another IP or collapsing all server actions onto a shared frontend egress bucket.
  - Required Vercel's platform-controlled client-IP header in production; generic forwarding headers remain available only for local development.
  - Added atomic account and IP counters, conflict-safe row creation, row locking, 15-minute expiry and temporary lockouts, expired-row cleanup, generic fail-closed errors, and `Retry-After`.
  - Stored only scoped HMAC-SHA256 identifiers under a dedicated backend secret; no raw account identifiers, IP addresses, passwords, credentials, tokens, or reusable authentication secrets enter the limiter table or logs.
  - Added an idempotent migration plus isolated SQLite-backed concurrency, expiry, boundary, authorization, and failure fixtures; no shared or production data was accessed.
- Required deployment configuration and normal migration application remain tracked separately under Active.

### Add isolated account, notification, and moderation action fixtures

- Status: Completed
- Added: 2026-07-15
- Completed: 2026-07-21
- Outcome:
  - Added pure dependency-injected operation seams while keeping Next.js Server Actions as thin authenticated adapters.
  - Covered avatar reset ownership, settings validation and persistence failure, password authorization and session-cookie boundaries, notification preference and self-suppression, concurrent deduplication, recipient ownership, bulk partial failure and retry, and stale-storage batch limits.
  - Covered administrator authorization-first behaviour, moderation validation, repeat approval deduplication, notification failure recovery, deal-media cleanup sequencing, and concurrent idempotent comment/report moderation.
  - Required the Strapi token on every comment-report clearing stage so a partially configured public request cannot silently enter a protected mutation workflow.
  - All fixtures use in-memory or temporary local stores and do not access shared or production data.
- Physical-device and production release QA remain tracked separately under Active.

### Remove demonstrably unused source and disposable build artifacts

- Status: Completed
- Added: 2026-07-21
- Completed: 2026-07-21
- Outcome:
  - Removed three unreferenced UI modules, their orphaned category-sidebar selectors, two ignored Strapi starter examples, five unused default Next.js public assets, and one unused React import.
  - Confirmed automatic scraping source and runtime dependencies remain absent; left Next.js optional peer metadata, transitive browser data, uncertain backup brand assets, and Strapi auto-discovered packages intact.
  - Cleared only reproducible build and typecheck output while preserving dependencies, local databases, uploads, environment files, credentials, Git data, and user-owned files.

### Implement the responsive mobile and tablet marketplace experience

- Status: Completed
- Added: 2026-07-15
- Completed: 2026-07-16
- Outcome:
  - Made the homepage feed-first and delivered a responsive 1/2/3/4-column feed, container-aware card actions, practical touch targets, responsive sizing hints, lazy loading, a touch-friendly gallery, and narrow profile pagination.
  - Added a single-row mobile logo/search header, safe-area-aware bottom navigation for menu, posting, account and authorized administrator access, a compact trust strip, and a two-tier sorting strip anchored to the deals section.
  - Preserved keyboard access, visible focus, reduced motion, light/dark themes, browser zoom and 320 CSS pixel reflow while correcting tablet, sparse-card, desktop-action and Safari capture regressions found during review.
  - Added the LAN development hostname to Next.js `allowedDevOrigins` so physical-phone testing hydrates interactive controls correctly.
  - Typecheck, lint, tests and production build passed; local browser verification passed at 320, 360, 390, 430, 768, 820, 1024 and 1180 CSS pixels without page-level overflow.
- Remaining real-device, production-performance and image-pipeline verification is tracked separately under Active.
- Research references:
  - [WCAG 2.2 reflow and input requirements](https://www.w3.org/TR/WCAG22/)
  - [W3C target-size guidance](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum)
  - [MDN container queries](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Containment/Container_queries)
  - [web.dev responsive images](https://web.dev/articles/serve-responsive-images)
  - [web.dev Interaction to Next Paint](https://web.dev/articles/optimize-inp)

### Redesign the administrator experience using Settings as the reference

- Status: Completed
- Added: 2026-07-15
- Completed: 2026-07-16
- Outcome:
  - Replaced the heavy sidebar/card dashboard with the Settings-style hierarchy, compact sticky navigation, restrained metrics, quieter controls and responsive moderation tables.
  - Preserved server-side administrator authorization and existing user, deal, comment and report moderation capabilities.
  - Added accessible destructive confirmation dialogs and inline loading, success and failure feedback without using native browser confirmation dialogs.
  - Typecheck, lint, tests and production builds passed; local mobile and desktop browser checks showed no horizontal overflow or console errors.
- Remaining physical-device workflow verification is tracked separately under Active.

### Implement safe first-party account settings and in-app notifications

- Status: Completed
- Added: 2026-07-15
- Completed: 2026-07-16
- Outcome:
  - Added profile-picture reset while preserving upload, compression, validation, error and fallback-initial behaviour.
  - Clarified and enforced immutable account handles separately from editable display names.
  - Added authenticated password changes with current-password verification, server validation, current-session refresh, and inline errors; distributed PostgreSQL throttling was completed separately on 2026-07-21.
  - Added paginated in-app notifications, preferences, event delivery, deduplication and read state for the currently supported first-party events.
  - Kept email-only preferences visibly unavailable until an email provider, verification, consent and unsubscribe controls exist.
  - Added focused helper tests for password validation, handle immutability, notification preferences and ownership, schema-safe payloads, deduplication and read-state rules.
- Destructive account lifecycle policy and email delivery remain tracked separately under Active.

### Temporarily remove automatic product scraping

- Status: Completed
- Added: 2026-07-15
- Completed: 2026-07-15
- Completion criteria:
  - Remove the user-facing automatic product fetch from deal submission without weakening manual field validation or duplicate checks.
  - Remove the public scrape API, Playwright/Chromium runtime dependencies, and scraper-specific deployment configuration.
  - Keep manual product URL, title, merchant, price, description, and authorized user-image upload workflows available on mobile and desktop.
