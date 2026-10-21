// GET /api/room-job/:id: a build job's progress, polled by the loading screen.

import { errorResponse, getJob, json } from "../../lib/netlify.js";

export default async (req, context) => {
  try {
    const job = await getJob(context.params.id);
    if (!job) return json({ error: "That summoning has been lost. Try again." }, 404);
    const { status, events, roomId = null, error = null } = job;
    return json({ status, events, roomId, error });
  } catch (err) {
    return errorResponse(err);
  }
};

export const config = { path: "/api/room-job/:id", method: "GET" };
