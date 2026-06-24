import { validateSafeExternalUrl } from "./dealUrlSecurity";

const allowedSimpleTags = new Set([
  "b",
  "strong",
  "i",
  "em",
  "s",
  "strike",
  "ul",
  "ol",
  "li",
  "hr",
  "p",
  "div",
  "br",
]);

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function decodeCommonEntities(value: string) {
  let output = value;

  for (let index = 0; index < 4; index += 1) {
    const decoded = output
      .replace(/&amp;/gi, "&")
      .replace(/&nbsp;/gi, " ")
      .replace(/&lt;/gi, "<")
      .replace(/&gt;/gi, ">")
      .replace(/&quot;/gi, '"')
      .replace(/&#39;/gi, "'");

    if (decoded === output) {
      break;
    }

    output = decoded;
  }

  return output;
}

function getAttribute(tag: string, name: string) {
  const match = tag.match(new RegExp(`${name}\\s*=\\s*["']([^"']+)["']`, "i"));
  return decodeCommonEntities(match?.[1] ?? "");
}

export function sanitizeDescriptionHtml(input: string) {
  const withoutDangerousBlocks = input.replace(/<script[\s\S]*?<\/script>/gi, "").replace(/<style[\s\S]*?<\/style>/gi, "");
  let output = "";
  let lastIndex = 0;

  for (const match of withoutDangerousBlocks.matchAll(/<\/?[^>]+>/g)) {
    const tag = match[0];
    const index = match.index ?? 0;
    output += escapeHtml(decodeCommonEntities(withoutDangerousBlocks.slice(lastIndex, index)));
    lastIndex = index + tag.length;

    const nameMatch = tag.match(/^<\/?\s*([a-z0-9]+)/i);
    const tagName = nameMatch?.[1]?.toLowerCase() ?? "";
    const isClosing = /^<\//.test(tag);

    if (!tagName) {
      continue;
    }

    if (allowedSimpleTags.has(tagName)) {
      if (tagName === "hr" || tagName === "br") {
        output += `<${tagName}>`;
      } else {
        output += isClosing ? `</${tagName}>` : `<${tagName}>`;
      }
      continue;
    }

    if (tagName === "a") {
      if (isClosing) {
        output += "</a>";
        continue;
      }

      const href = getAttribute(tag, "href");
      const validation = validateSafeExternalUrl(href, { allowMailto: true });
      output += validation.ok
        ? `<a href="${escapeHtml(validation.url)}" target="_blank" rel="noopener noreferrer nofollow ugc">`
        : "<a>";
      continue;
    }

    if (tagName === "img" && !isClosing) {
      const src = getAttribute(tag, "src");
      const alt = getAttribute(tag, "alt");
      const className = getAttribute(tag, "class");
      const safeClassName =
        className === "deal-description-image-center" || className === "deal-description-image-left"
          ? className
          : "deal-description-image-left";
      const validation = validateSafeExternalUrl(src);
      if (validation.ok) {
        output += `<img src="${escapeHtml(validation.url)}" alt="${escapeHtml(alt)}" class="${safeClassName}" loading="lazy">`;
      }
    }
  }

  output += escapeHtml(decodeCommonEntities(withoutDangerousBlocks.slice(lastIndex)));
  return output.trim();
}

export function getDescriptionText(input: string) {
  const output = input
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ");

  return decodeCommonEntities(output).replace(/\s+/g, " ").trim();
}
