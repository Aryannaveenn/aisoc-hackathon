// Building, storing and listing rooms.

import { Router } from "express";
import { fetchTerms, parseTermsUrl } from "../lib/fetchTerms.js";
import { checkTermsLength, generateRoom } from "../lib/generateRoom.js";
import { getRoom, listRooms, saveRoom } from "../lib/roomStore.js";
import { THEMES, randomThemeId } from "../lib/themes.js";
import { UserError } from "../lib/errors.js";
import { errorBody, sendError } from "../lib/http.js";

const router = Router();

const wordCount = (text) => {
  const n = text.split(/\s+/).filter(Boolean).length;
  return (n >= 1000 ? Math.round(n / 100) * 100 : n).toLocaleString("en-US");
};

// Streams NDJSON progress, then the saved room. See docs/CONTRACTS.md.
router.post("/api/room", async (req, res) => {
  const { url, text, theme } = req.body ?? {};
  const pasted = typeof text === "string" && text.trim() ? text : null;

  // Problems we can spot before streaming come back as plain JSON 4xx.
  let sourceUrl = null;
  let themeId;
  try {
    if (pasted) {
      checkTermsLength(pasted);
    } else {
      if (typeof url !== "string" || !url.trim()) throw new UserError("Give a link to the terms, or paste the text.");
      sourceUrl = parseTermsUrl(url).href;
    }
    if (theme != null && !Object.hasOwn(THEMES, theme)) throw new UserError(`There's no room called "${theme}".`);
    themeId = theme ?? randomThemeId();
  } catch (err) {
    return sendError(res, err);
  }

  res.status(200);
  res.set({
    "Content-Type": "application/x-ndjson; charset=utf-8",
    "Cache-Control": "no-cache, no-transform",
    "X-Accel-Buffering": "no",
  });
  res.flushHeaders();
  res.socket?.setNoDelay(true);

  // If the player leaves, stop fetching and stop Claude.
  const abort = new AbortController();
  res.on("close", () => {
    if (!res.writableFinished) abort.abort();
  });
  const send = (line) => {
    if (!res.writableEnded && !res.destroyed) res.write(JSON.stringify(line) + "\n");
  };
  const status = (message) => send({ type: "status", message });

  try {
    let terms = pasted;
    if (!terms) {
      status("Fetching the terms…");
      terms = await fetchTerms(sourceUrl, { signal: abort.signal });
    }
    terms = checkTermsLength(terms);
    status(`Reading ${wordCount(terms)} words of fine print…`);
    status(`Building ${THEMES[themeId].name.replace(/^The /, "the ")}…`);

    const room = await generateRoom(terms, {
      theme: themeId,
      signal: abort.signal,
      onStatus: status,
      onClause: ({ ref, title, quote }) => send({ type: "clause", ref, title, quote }),
    });
    status("Sealing the doors…");
    const saved = await saveRoom({ ...room, sourceUrl });
    send({ type: "room", room: saved });
  } catch (err) {
    if (abort.signal.aborted) return res.end();
    send({ type: "error", error: errorBody(err).error });
  }
  res.end();
});

router.get("/api/rooms", async (req, res) => {
  try {
    res.json({ rooms: await listRooms() });
  } catch (err) {
    sendError(res, err);
  }
});

router.get("/api/room/:id", async (req, res) => {
  try {
    const room = await getRoom(req.params.id);
    if (!room) return res.status(404).json({ error: "That room has crumbled to dust. Summon a new one." });
    res.json(room);
  } catch (err) {
    sendError(res, err);
  }
});

export default router;
