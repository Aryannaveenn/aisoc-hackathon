// Building a room from a request: check it, fetch the terms, ask Claude, save.
// Shared by the Express server (routes/rooms.js) and the Netlify background
// function (netlify/functions/room-worker-background.mjs).

import { fetchTerms, parseTermsUrl } from "./fetchTerms.js";
import { checkTermsLength, generateRoom } from "./generateRoom.js";
import { saveRoom } from "./roomStore.js";
import { THEMES, randomThemeId } from "./themes.js";
import { UserError } from "./errors.js";

const wordCount = (text) => {
  const n = text.split(/\s+/).filter(Boolean).length;
  return (n >= 1000 ? Math.round(n / 100) * 100 : n).toLocaleString("en-US");
};

// Checks a POST /api/room body. Throws a UserError for anything we can reject
// before doing real work.
export function parseRoomRequest(body) {
  const { url, text, theme } = body ?? {};
  const pasted = typeof text === "string" && text.trim() ? text : null;
  let sourceUrl = null;
  if (pasted) {
    checkTermsLength(pasted);
  } else {
    if (typeof url !== "string" || !url.trim()) throw new UserError("Give a link to the terms, or paste the text.");
    sourceUrl = parseTermsUrl(url).href;
  }
  if (theme != null && !Object.hasOwn(THEMES, theme)) throw new UserError(`There's no room called "${theme}".`);
  return { pasted, sourceUrl, themeId: theme ?? randomThemeId() };
}

// Runs the whole build. `emit` receives { type: "status", message } and
// { type: "clause", ref, title, quote } as they happen. Returns the saved room.
export async function buildRoom({ pasted, sourceUrl, themeId }, { emit = () => {}, signal } = {}) {
  const status = (message) => emit({ type: "status", message });

  let terms = pasted;
  if (!terms) {
    status("Fetching the terms…");
    terms = await fetchTerms(sourceUrl, { signal });
  }
  terms = checkTermsLength(terms);
  status(`Reading ${wordCount(terms)} words of fine print…`);
  status(`Building ${THEMES[themeId].name.replace(/^The /, "the ")}…`);

  const room = await generateRoom(terms, {
    theme: themeId,
    signal,
    onStatus: status,
    onClause: ({ ref, title, quote }) => emit({ type: "clause", ref, title, quote }),
  });
  status("Sealing the doors…");
  return saveRoom({ ...room, sourceUrl });
}
