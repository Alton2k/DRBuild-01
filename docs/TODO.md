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

### Refine the mobile and tablet marketplace experience

- Status: Repository implementation complete; physical-device and production verification pending
- Priority: P1 — Release assurance
- Added: 2026-07-15
- Updated: 2026-07-16
- Repository progress:
  - Completed the feed-first mobile order, responsive 1/2/3/4-column feed, container-aware deal actions, 44px repeated controls, responsive sizing hints, lazy loading, touch-friendly gallery, and narrow profile pagination.
  - Corrected responsive regressions discovered after completion: placed the deal check before the feed in document order and anchored it with named grid areas, kept the tablet feed at two columns, aligned and compacted mobile navigation, search, hero, menu, category, trust points, and sorting controls, added a single-row mobile logo/search header, a safe-area-aware bottom navigation for menu, posting, account, and authorized administrator access, a three-column mobile trust strip, and a divider-attached two-tier mobile sorting strip whose filter navigation stays anchored to the deals section, kept desktop account actions out of phone-landscape/tablet headers, prevented sparse content from stretching card height, restored the compact desktop card action row, and removed mobile pseudo-gradients that mis-composited in Safari full-page captures.
  - Added the current LAN hostname to Next.js `allowedDevOrigins` so phone-based local development hydrates client controls instead of rendering inert Menu, Categories, autocomplete, voting, saving, and other interactive UI.
  - Automated typecheck, lint, tests, and production build pass. Local browser checks pass at 320, 360, 390, 430, 768, 820, 1024, and 1180 CSS pixels with no page-level overflow; the 1024px three-column feed regression found during review was corrected.
  - **P1:** Complete physical iOS Safari and Android Chrome checks before launch, measure production Core Web Vitals after public deployment, and select a trusted image transformation pipeline capable of generating real `srcset` variants for arbitrary user media before image traffic scales.
- Goal: Make Deal Rakyat faster and easier to scan and operate on phones and tablets without replacing the responsive foundation that already works.
- Completion criteria:
  - Make the mobile homepage feed-first by compacting the introduction and moving secondary trust and deal-check content below the first deal results where appropriate.
  - Make deal cards respond to their available container width, including a practical three-column tablet stage between the current two- and four-column layouts.
  - Replace the fixed-width deal-card action grid with an adaptable layout that does not clip or overlap when coarse-pointer controls expand.
  - Give voting, comments, save, share, carousel, pagination, and other repeated touch controls consistent hit areas of about 44 by 44 CSS pixels where space permits.
  - Deliver responsive image sizes to phones and tablets, preserve intrinsic dimensions, and lazy-load below-fold deal media.
  - Use a full-width mobile gallery with touch-friendly previous/next controls and a horizontal thumbnail strip or paging indicators; swipe must not be the only way to change images.
  - Simplify profile pagination on narrow screens while retaining the fuller page window on tablets and desktops.
  - Preserve keyboard access, focus visibility, reduced motion, light and dark themes, safe areas, browser zoom, and 320 CSS pixel reflow.
  - Measure mobile Core Web Vitals in production, with Interaction to Next Paint at or below 200 milliseconds at the 75th percentile as the responsiveness target.
  - Verify the actual workflows at 320, 360, 390, 430, 768, 820, 1024, and 1180 CSS pixels in portrait and relevant landscape layouts.
  - Complete final physical-device checks on iOS Safari and Android Chrome, including software keyboard, file picker, touch, safe-area, rotation, and zoom behavior.
- Research references:
  - [WCAG 2.2 reflow and input requirements](https://www.w3.org/TR/WCAG22/)
  - [W3C target-size guidance](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum)
  - [MDN container queries](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Containment/Container_queries)
  - [web.dev responsive images](https://web.dev/articles/serve-responsive-images)
  - [web.dev Interaction to Next Paint](https://web.dev/articles/optimize-inp)

### Redesign the admin experience using Settings as the reference

- Status: Repository implementation complete; release verification and action regression coverage pending
- Priority: P1 — Release assurance
- Added: 2026-07-15
- Updated: 2026-07-16
- Repository progress:
  - Replaced the heavy sidebar/card dashboard with the Settings-style section hierarchy, compact sticky navigation, restrained metrics, quieter controls, and responsive moderation tables.
  - Preserved the server-side administrator redirect and every existing deal/comment moderation action, including accessible destructive confirmation dialogs and inline failure states.
  - Typecheck, lint, tests, and production builds pass. Local mobile and desktop browser checks show no horizontal overflow and a clean console; final physical-device, dark-theme, full keyboard workflow, and isolated moderation-action regression coverage remain for release QA.
- Goal: Redesign the admin dashboard around the quieter, section-based layout and control language established by the profile Settings page.
- Completion criteria:
  - Use the Settings page's restrained hierarchy, left-side section introductions, right-side working areas, dividers, compact controls, and direct status messaging as the visual reference without copying account-specific content.
  - Preserve every existing server-side administrator authorization check and moderation capability for users, deals, comments, reports, approval, rejection, restoration, and deletion.
  - Replace the current dashboard's heavy sidebar and card treatment with a scan-friendly moderation workspace that keeps queues, trust signals, filters, and destructive actions clearly separated.
  - Keep high-volume moderation information compact on desktop and readable on phones and tablets, with no page-level horizontal overflow or hidden required actions.
  - Cover loading, empty, error, filtered, pending, success, and destructive-confirmation states in light and dark themes with full keyboard access and visible focus.
  - Verify the redesign at mobile, tablet, and desktop widths and add regression coverage for administrator access and moderation actions.

### Complete account settings that do not require email delivery

- Status: Partially completed; destructive lifecycle blocked
- Priority: P0 for production throttling and account deletion prerequisites; P1 for isolated action coverage; P2 for email-dependent features
- Added: 2026-07-15
- Updated: 2026-07-16
- Repository progress:
  - Completed profile-picture reset, immutable-handle UI and server enforcement, authenticated password change with validation/current-session refresh/best-effort per-instance throttling, disabled email-only preferences, and the paginated in-app notification schema, event delivery, inbox, preferences, deduplication, and read state.
  - **P1:** Added focused pure-helper tests for password validation, handle immutability, notification preferences and ownership, schema-safe notification payloads, deduplication, and read-state rules. Add isolated integration fixtures for avatar reset, password authorization, notification delivery and mutation, account/notification server actions, and administrator moderation actions.
  - **P0:** Choose PostgreSQL or Redis for a shared password account-and-IP limiter before treating throttling as production-grade; the current in-process limiter is intentionally best-effort and does not provide distributed abuse protection.
  - **P0 before enabling deletion:** Adopt revocable sessions or refresh tokens and decide recent-authentication proof, retention and legal holds, content anonymisation, recovery windows, and administrator audit policy. Legacy Strapi JWTs cannot currently be invalidated before expiry, so account deactivation/deletion must remain unavailable until these decisions are implemented.
  - **P2:** Configure an approved email provider and required environment variables before enabling forgotten-password recovery, email-address changes, weekly summaries, or marketing email; ownership verification, consent, and unsubscribe controls remain required where applicable.
- Goal: Finish useful first-party profile and account controls that can operate safely before Resend, email verification, and recovery are configured.
- Completion criteria:
  - Add a clear remove/reset action for the profile picture and preserve the existing upload, compression, validation, error, and fallback-initial behavior.
  - Keep the account username/handle immutable, distinguish it clearly from the editable display name, and remove any suggestion that the handle can currently be edited.
  - Add an authenticated change-password workflow using the current password, new password, confirmation, server-side validation, session handling, rate limiting, and actionable inline errors; keep forgotten-password recovery deferred until email delivery exists.
  - Implement an in-app notification model and inbox for enabled new-comment, comment-reply, deal-approval, and saved-deal-update preferences instead of merely storing unused toggles.
  - Keep weekly summaries and marketing emails disabled or clearly unavailable until Resend and the required consent, unsubscribe, and delivery controls are configured.
  - Implement safe account deactivation and deletion with explicit confirmation, recent-authentication checks, moderation and legal-retention rules, content anonymisation or ownership decisions, session invalidation, and an auditable administrator recovery policy where appropriate.
  - Keep email-address changes deferred until Deal Rakyat can verify ownership of the new address.
  - Add tests for avatar removal, password validation and authorization, notification preference enforcement, notification read state, account deactivation/deletion races, retained-content rules, failure recovery, and mobile/keyboard accessibility.

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

### Temporarily remove automatic product scraping

- Status: Completed
- Added: 2026-07-15
- Completed: 2026-07-15
- Completion criteria:
  - Remove the user-facing automatic product fetch from deal submission without weakening manual field validation or duplicate checks.
  - Remove the public scrape API, Playwright/Chromium runtime dependencies, and scraper-specific deployment configuration.
  - Keep manual product URL, title, merchant, price, description, and authorized user-image upload workflows available on mobile and desktop.
