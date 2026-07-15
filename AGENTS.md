<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Deal Rakyat engineering instructions

## Architecture

- The repository root contains the Next.js frontend.
- `backend/` contains the Strapi backend.
- Vercel hosts the frontend, Railway hosts Strapi, Neon provides PostgreSQL, and Cloudflare provides DNS, Access, and R2 media storage.
- Production secrets belong only in provider environment variables or ignored local `.env` files.

## Working practices

- Read the relevant implementation, tests, documentation, and neighbouring components before editing.
- Preserve unrelated user changes and staged work.
- Implement the smallest complete solution using existing project patterns.
- Do not perform speculative refactors or expand the requested scope.
- Use `rg` for repository searches and `apply_patch` for manual edits.
- Update relevant documentation when behaviour, configuration, or setup changes.
- Record every agreed project TODO in `docs/TODO.md` with its status, date, and concise completion criteria.

## Security and shared data

- Keep secrets in server-only modules and never prefix confidential values with `NEXT_PUBLIC_`.
- Enforce ownership and administrator authorization on the server; hidden UI is not authorization.
- Validate untrusted input and protect against duplicate submissions and destructive-action races.
- Never log or expose passwords, tokens, cookies, database credentials, or provider secrets.
- Treat configured remote Strapi and PostgreSQL services as shared or production data.
- Modify only data required by an explicitly authorized workflow and delete only QA records created for that workflow.

## Git and external systems

- Do not commit, push, merge, deploy, change DNS, alter provider settings, or edit production environment variables unless the user explicitly requests it.
- Never commit `.env` files or secrets.
- Report unrelated worktree changes before editing overlapping files.

## Validation

Run checks proportionate to the change:

- `npm run typecheck`
- `npm run lint`
- `npm test`
- `npm run build`
- `npm run backend:build` for backend changes
- `npm run db:check` only when authorized to access the configured database

For user-facing changes, test the actual workflow at desktop and mobile sizes, including keyboard interaction, light and dark themes, and loading, success, empty, validation, and failure states.

## Interface conventions

- Follow existing Deal Rakyat components, spacing, typography, colors, and control patterns.
- Keep layouts responsive and keyboard accessible.
- Avoid unnecessary cards, gradients, shadows, and oversized rounded containers.
- Avoid native `alert` and `confirm` dialogs.

## Multi-agent operating model

The primary agent acts as Deal Rakyat's engineering project manager and remains accountable for the final result.

For substantial tasks with independent workstreams, the primary agent should:

1. Understand the request and inspect the repository before delegating.
2. Divide the work into concrete, bounded assignments.
3. Use only the specialist roles that materially help the task.
4. Give each specialist non-overlapping file ownership or a read-only assignment.
5. Run no more than three sub-agents concurrently.
6. Review every specialist's findings and changes personally.
7. Resolve integration problems and assign follow-up fixes when needed.
8. Run final automated checks and browser workflows itself.
9. Deliver one consolidated result to the user.

Available role charters:

- Frontend Developer: `docs/agent-roles/frontend.md`
- Backend Developer: `docs/agent-roles/backend.md`
- Research Engineer: `docs/agent-roles/research.md`
- Review Engineer: `docs/agent-roles/reviewer.md`

Every delegated assignment must include the applicable role charter, concrete objective, owned files or directories, edit or read-only permission, required evidence and checks, and a clear stopping condition.

Do not use sub-agents for small or tightly coupled changes where coordination would cost more than it saves. Because the environment supports the primary agent plus three concurrent sub-agents, use this default sequence when all roles are justified:

- Wave 1: Primary agent, Frontend Developer, Backend Developer, and Research Engineer.
- Wave 2: Start the Review Engineer after one Wave 1 specialist finishes and meaningful implementation exists.

Sub-agents must not commit, push, deploy, change provider settings, alter unrelated data, delegate further, or expand their scope unless the primary agent explicitly authorizes it within the user's request.

### Token-efficient delegation

- Default to no sub-agent for small, sequential, or single-file work.
- Prefer one specialist. Add a second or third only when independent work can proceed concurrently and materially reduce risk or elapsed time.
- Do not automatically use every role. Research is for unresolved or time-sensitive evidence; Review is for security-sensitive, cross-cutting, release-critical, or high-regression-risk work.
- Do not use both Research and Review when the primary agent can perform one of those functions with little additional work.
- Before spawning, inspect enough of the repository to provide exact files, questions, constraints, and expected output so specialists do not repeat broad discovery.
- Give specialists only the conversation context needed for their bounded assignment.
- Do not assign the same investigation, implementation, or verification to multiple agents unless an independent review is explicitly valuable.
- Specialists should read only relevant files and references, stop when their assignment is satisfied, and avoid narrating routine tool use.
- Specialist handoffs should normally stay under 400 words and contain only findings, changes, evidence, risks, and blockers needed by the primary agent.
- The primary agent should reuse specialist evidence rather than rerunning identical read-only checks, while still inspecting edits and performing final integration verification.
