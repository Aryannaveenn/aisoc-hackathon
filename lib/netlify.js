// Netlify setup shared by every function in netlify/functions. Importing this
// points the room store at the bundled built-in rooms and at Netlify Blobs.

import { getStore } from "@netlify/blobs";
import crypto from "node:crypto";
import builtInRooms from "./generated/builtInRooms.js";
import { configureRoomStore, summarize } from "./roomStore.js";
import { errorBody } from "./http.js";

// Strong consistency: a room or job written by one function is read straight
// away by another (the loading screen polls while the worker writes).
const roomStore = () => getStore({ name: "rooms", consistency: "strong" });
const jobStore = () => getStore({ name: "room-jobs", consistency: "strong" });
const requestStore = () => getStore({ name: "room-job-requests", consistency: "strong" });

configureRoomStore({
  builtIn: {
    get: async (id) => (Object.hasOwn(builtInRooms, id) ? builtInRooms[id] : null),
    all: async () => Object.values(builtInRooms),
  },
  generated: {
    get: (id) => roomStore().get(id, { type: "json" }),
    save: (room) => roomStore().setJSON(room.id, room, { metadata: summarize(room, false) }),
    async summaries() {
      const store = roomStore();
      const { blobs } = await store.list();
      const entries = await Promise.all(blobs.slice(-200).map((b) => store.getMetadata(b.key)));
      return entries.filter((e) => e?.metadata?.id).map((e) => e.metadata);
    },
  },
});

export function json(body, status = 200) {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

export function errorResponse(err) {
  const { status, error } = errorBody(err);
  return json({ error }, status);
}

export async function readBody(req) {
  try {
    return await req.json();
  } catch {
    return {};
  }
}

/* ---------- Room-building jobs ----------
   POST /api/room can't stream for longer than 60 seconds on Netlify, so it
   stores the request as a job, hands it to a background function (15-minute
   limit) and returns the job id. The worker records progress events on the
   job, and the loading screen polls GET /api/room-job/:id for them. */

const JOB_ID = /^[a-f0-9]{24}$/;
const START_TIMEOUT_MS = 90 * 1000;
const RUN_TIMEOUT_MS = 16 * 60 * 1000;

export async function createJob(request) {
  const id = crypto.randomBytes(12).toString("hex");
  const now = Date.now();
  // The request (which can hold a long pasted text) is kept apart from the
  // progress record, so progress writes stay small.
  await requestStore().setJSON(id, request);
  await jobStore().setJSON(id, { status: "queued", events: [], createdAt: now, updatedAt: now });
  return id;
}

export async function getJobRequest(id) {
  return JOB_ID.test(id) ? requestStore().get(id, { type: "json" }) : null;
}

export async function getJob(id) {
  if (!JOB_ID.test(id ?? "")) return null;
  const job = await jobStore().get(id, { type: "json" });
  if (!job) return null;
  // A worker that never started or died without reporting would leave the
  // player waiting forever; report it as failed instead.
  const age = Date.now() - job.updatedAt;
  if ((job.status === "queued" && age > START_TIMEOUT_MS) || (job.status === "running" && age > RUN_TIMEOUT_MS)) {
    return { ...job, status: "error", error: "The ritual stalled before the room was ready. Try again." };
  }
  return job;
}

// Returns a recorder for one job. Writes are queued so they land in order.
export function jobRecorder(id, job) {
  const store = jobStore();
  const state = { ...job };
  let writing = Promise.resolve();
  const write = () => {
    const snapshot = { ...state, events: [...state.events], updatedAt: Date.now() };
    writing = writing.then(() => store.setJSON(id, snapshot)).catch((err) => console.error("job write failed", err));
    return writing;
  };
  return {
    start: () => {
      state.status = "running";
      return write();
    },
    event: (event) => {
      state.events.push(event);
      return write();
    },
    done: (roomId) => {
      Object.assign(state, { status: "done", roomId });
      return write();
    },
    fail: (error) => {
      Object.assign(state, { status: "error", error });
      return write();
    },
    settled: () => writing,
  };
}
