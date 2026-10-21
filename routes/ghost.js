// "Ask the ghost" (POST /api/ghost); see docs/CONTRACTS.md.

import { Router } from "express";
import { askGhost, validateQuestion } from "../lib/ghost.js";
import { getRoom } from "../lib/roomStore.js";
import { sendError } from "../lib/http.js";

const router = Router();

// The game allows 3 questions per play; this only stops runaway clients.
const WINDOW_MS = 10 * 60 * 1000;
const LIMIT = 40;
const recent = new Map();

function overLimit(ip) {
  const now = Date.now();
  const times = (recent.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  times.push(now);
  recent.set(ip, times);
  if (recent.size > 5000) recent.clear();
  return times.length > LIMIT;
}

router.post("/api/ghost", async (req, res) => {
  const { roomId, question, history } = req.body ?? {};
  try {
    validateQuestion(question, history);
    const room = await getRoom(roomId);
    if (!room) return res.status(404).json({ error: "That room has crumbled to dust, and its ghost with it." });
    if (overLimit(req.ip)) {
      return res.status(429).json({ error: "The ghost is exhausted. Let it rest a few minutes." });
    }
    const { answer } = await askGhost(room, question, history);
    res.json({ answer });
  } catch (err) {
    sendError(res, err);
  }
});

export default router;
