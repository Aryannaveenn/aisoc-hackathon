// GET /api/room/:id: one room, in full.

import { errorResponse, json } from "../../lib/netlify.js";
import { getRoom } from "../../lib/roomStore.js";

export default async (req, context) => {
  try {
    const room = await getRoom(context.params.id);
    if (!room) return json({ error: "That room has crumbled to dust. Summon a new one." }, 404);
    return json(room);
  } catch (err) {
    return errorResponse(err);
  }
};

export const config = { path: "/api/room/:id", method: "GET" };
