// Building, storing and listing rooms (the local Express server; on Netlify the
// same work is done by netlify/functions/*).

import { Router } from "express";
import { buildRoom, parseRoomRequest } from "../lib/roomPipeline.js";
import { getRoom, listRooms } from "../lib/roomStore.js";
import { errorBody, sendError } from "../lib/http.js";

const router = Router();

// Streams NDJSON progress, then the saved room. See docs/CONTRACTS.md.
router.post("/api/room", async (req, res) => {
  // Problems we can spot before streaming come back as plain JSON 4xx.
  let request;
  try {
    request = parseRoomRequest(req.body);
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

  try {
    const room = await buildRoom(request, { emit: send, signal: abort.signal });
    send({ type: "room", room });
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
