// Fetches a terms & conditions page and reduces it to readable plain text.

import { UserError } from "./errors.js";

const MAX_BYTES = 5_000_000;

const ENTITIES = {
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ",
  rsquo: "’", lsquo: "‘", rdquo: "”", ldquo: "“",
  mdash: "—", ndash: "–", hellip: "…", copy: "©", reg: "®", trade: "™",
};

function decodeEntities(s) {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, code) => {
    if (code[0] === "#") {
      const n = code[1].toLowerCase() === "x" ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
      return Number.isFinite(n) ? String.fromCodePoint(n) : m;
    }
    return ENTITIES[code.toLowerCase()] ?? m;
  });
}

export function htmlToText(html) {
  return decodeEntities(
    html
      .replace(/<(script|style|noscript|svg|nav|footer|header|form)\b[\s\S]*?<\/\1>/gi, " ")
      .replace(/<!--[\s\S]*?-->/g, " ")
      .replace(/<\/(p|div|section|article|li|h[1-6]|tr|br)\s*>/gi, "\n")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<li\b[^>]*>/gi, "\n- ")
      .replace(/<[^>]+>/g, " "),
  )
    .replace(/[ \t ]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export async function fetchTerms(rawUrl) {
  let url;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new UserError("That doesn't look like a web address. Include the https:// part.");
  }
  if (!["http:", "https:"].includes(url.protocol)) {
    throw new UserError("Only http and https links are supported.");
  }

  let res;
  try {
    res = await fetch(url, {
      redirect: "follow",
      signal: AbortSignal.timeout(15_000),
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; TermsOfDread/0.1; hackathon game)",
        Accept: "text/html,text/plain;q=0.9,*/*;q=0.5",
      },
    });
  } catch {
    throw new UserError("The page didn't respond. Check the link, or paste the terms text instead.");
  }
  if (!res.ok) {
    throw new UserError(`The site returned ${res.status}. Some sites block bots, so paste the terms text instead.`);
  }

  const body = await res.text();
  if (body.length > MAX_BYTES) {
    throw new UserError("That page is too large to read. Paste the terms text instead.");
  }
  const type = res.headers.get("content-type") ?? "";
  return type.includes("text/plain") ? body.trim() : htmlToText(body);
}
