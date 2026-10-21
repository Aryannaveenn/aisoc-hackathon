// POST /api/room: checks the request, queues a build job and starts the
// background worker. Answers 202 { jobId }; the client then polls the job.

import { createJob, errorResponse, json, readBody } from "../../lib/netlify.js";
import { parseRoomRequest } from "../../lib/roomPipeline.js";

export default async (req) => {
  let request;
  try {
    request = parseRoomRequest(await readBody(req));
  } catch (err) {
    return errorResponse(err);
  }

  try {
    const jobId = await createJob(request);
    const started = await fetch(new URL("/.netlify/functions/room-worker-background", req.url), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jobId }),
    });
    if (!started.ok) throw new Error(`Background worker refused the job (${started.status})`);
    return json({ jobId }, 202);
  } catch (err) {
    return errorResponse(err);
  }
};

// Each room is a long Claude call, so cap it per visitor: 3 rooms per 3 minutes.
// (The free plan allows 2 code-based rate-limit rules; this and ghost.mjs use them.)
export const config = {
  path: "/api/room",
  method: "POST",
  rateLimit: { windowLimit: 3, windowSize: 180, aggregateBy: ["ip", "domain"] },
};
