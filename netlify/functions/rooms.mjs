// GET /api/rooms: every room's summary, for the presets and the leaderboard.

import { errorResponse, json } from "../../lib/netlify.js";
import { listRooms } from "../../lib/roomStore.js";

export default async () => {
  try {
    return json({ rooms: await listRooms() });
  } catch (err) {
    return errorResponse(err);
  }
};

export const config = { path: "/api/rooms", method: "GET" };
