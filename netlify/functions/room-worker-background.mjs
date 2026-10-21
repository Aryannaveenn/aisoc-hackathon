// Background function (up to 15 minutes): builds the room for a queued job and
// records progress on it as it goes. Started by room-start.mjs.

import { getJob, getJobRequest, jobRecorder } from "../../lib/netlify.js";
import { buildRoom } from "../../lib/roomPipeline.js";
import { errorBody } from "../../lib/http.js";

export default async (req) => {
  const { jobId } = await req.json().catch(() => ({}));
  const job = await getJob(jobId);
  // Only pick up fresh jobs, so a repeated request can't run a build twice.
  if (!job || job.status !== "queued") return;
  const request = await getJobRequest(jobId);
  if (!request) return;

  const record = jobRecorder(jobId, job);
  await record.start();
  try {
    const room = await buildRoom(request, { emit: record.event });
    await record.done(room.id);
  } catch (err) {
    await record.fail(errorBody(err).error);
  }
  await record.settled();
};

export const config = { background: true };
