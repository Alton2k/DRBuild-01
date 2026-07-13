import {
  SITE_ACCESS_MAXIMUM_CODE_LENGTH,
  SITE_ACCESS_MINIMUM_CODE_LENGTH,
} from "./siteAccess.ts";

export type SiteAccessPageError = "invalid" | "unavailable" | null;

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "'": "&#39;",
      '"': "&quot;",
    };
    return entities[character];
  });
}

export function getSiteAccessPageError(value: string | null): SiteAccessPageError {
  return value === "invalid" || value === "unavailable" ? value : null;
}

export function renderSiteAccessPage({
  next,
  error,
  configured,
}: {
  next: string;
  error: SiteAccessPageError;
  configured: boolean;
}) {
  const message = !configured || error === "unavailable"
    ? "Access is temporarily unavailable."
    : error === "invalid"
      ? "Unable to continue with that code."
      : "";

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
  <meta name="robots" content="noindex,nofollow,noarchive,noimageindex">
  <meta name="referrer" content="no-referrer">
  <title>Development preview</title>
  <link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='8' fill='%23111827'/%3E%3C/svg%3E">
  <style>
    :root{color-scheme:light dark;font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
    *{box-sizing:border-box}
    body{min-height:100vh;margin:0;display:grid;place-items:center;background:#f8fafc;color:#0f172a;padding:24px}
    main{width:min(100%,384px)}
    h1{margin:0 0 24px;text-align:center;font-size:24px;line-height:1.25;font-weight:650;letter-spacing:-.025em}
    form{display:grid;gap:16px}
    label{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
    input,button{width:100%;height:48px;border-radius:16px;font:inherit}
    input{border:1px solid #cbd5e1;background:#fff;color:#0f172a;padding:0 16px;outline:none}
    input:focus{border-color:#64748b;box-shadow:0 0 0 3px rgba(100,116,139,.18)}
    button{border:0;background:#111827;color:#fff;font-weight:650;cursor:pointer}
    button:hover{background:#1f2937}
    button:focus-visible{outline:3px solid rgba(100,116,139,.35);outline-offset:2px}
    button:disabled{cursor:not-allowed;opacity:.55}
    p{margin:0;color:#b42318;font-size:14px;line-height:1.45;text-align:center}
    @media(prefers-color-scheme:dark){body{background:#020617;color:#f8fafc}input{border-color:#334155;background:#0f172a;color:#f8fafc}button{background:#f8fafc;color:#111827}button:hover{background:#e2e8f0}p{color:#fda29b}}
  </style>
</head>
<body>
  <main>
    <h1>This site is under development</h1>
    <form action="/api/site-access" method="post" autocomplete="off">
      <input type="hidden" name="next" value="${escapeHtml(next)}">
      <label for="access-code">Access code</label>
      <input id="access-code" name="accessCode" type="password" required minlength="${SITE_ACCESS_MINIMUM_CODE_LENGTH}" maxlength="${SITE_ACCESS_MAXIMUM_CODE_LENGTH}" autocomplete="current-password" spellcheck="false" autofocus${configured ? "" : " disabled"}>
      ${message ? `<p role="alert">${message}</p>` : ""}
      <button type="submit"${configured ? "" : " disabled"}>Continue</button>
    </form>
  </main>
</body>
</html>`;
}
