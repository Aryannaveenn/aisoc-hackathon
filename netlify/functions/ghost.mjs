// POST /api/ghost: "Ask the ghost". See docs/CONTRACTS.md.

import { errorResponse, json, readBody } from "../../lib/netlify.js";
import { askGhost, validateQuestion } from "../../lib/ghost.js";
import { getRoom } from "../../lib/roomStore.js";

export default async (req) => {
  const { roomId, question, history } = await readBody(req);
  try {
    validateQuestion(question, history);
    const room = await getRoom(roomId);
    if (!room) return json({ error: "That room has crumbled to dust, and its ghost with it." }, 404);
    const { answer } = await askGhost(room, question, history);
    return json({ answer });
  } catch (err) {
    return errorResponse(err);
  }
};

// The game allows 5 questions per play; this stops runaway clients.
export const config = {
  path: "/api/ghost",
  method: "POST",
  rateLimit: { windowLimit: 15, windowSize: 60, aggregateBy: ["ip", "domain"] },
};
