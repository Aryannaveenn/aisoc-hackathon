// Where rooms live. Built-in rooms are the demo (public/demo) and the pre-built
// famous-site rooms (data/prebuilt, committed). Rooms players generate go to
// data/generated (gitignored). That's the local setup; on Netlify, lib/netlify.js
// swaps in built-in rooms bundled into the function and a Netlify Blobs store.

import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

const DATA = path.resolve("data");
const PREBUILT = path.join(DATA, "prebuilt");
const GENERATED = path.join(DATA, "generated");
const DEMO = path.resolve("public/demo");

const ID_PATTERN = /^[a-z0-9-]{1,80}$/;

export function newRoomId(company = "room") {
  const slug = company.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "room";
  return `${slug}-${crypto.randomBytes(3).toString("hex")}`;
}

export function summarize(room, preset) {
  return {
    id: room.id,
    company: room.company,
    theme: room.theme,
    sourceUrl: room.sourceUrl ?? null,
    dread: room.dread ? { score: room.dread.score, label: room.dread.label } : null,
    preset,
    createdAt: room.createdAt ?? null,
  };
}

async function readJson(file) {
  try {
    return JSON.parse(await fs.readFile(file, "utf8"));
  } catch (err) {
    if (err.code === "ENOENT") return null;
    throw err;
  }
}

async function readDir(dir) {
  try {
    return (await fs.readdir(dir)).filter((f) => f.endsWith(".json"));
  } catch (err) {
    if (err.code === "ENOENT") return [];
    throw err;
  }
}

// Reads the demo room and every pre-built room from disk, keyed by id.
export async function readBuiltInRooms() {
  const rooms = {};
  const demo = await readJson(path.join(DEMO, "room.json"));
  if (demo) rooms.demo = { ...demo, termsText: await fs.readFile(path.join(DEMO, "terms.txt"), "utf8") };
  for (const file of await readDir(PREBUILT)) {
    const room = await readJson(path.join(PREBUILT, file));
    if (room) rooms[room.id] = room;
  }
  return rooms;
}

const diskBuiltIn = {
  async get(id) {
    if (id === "demo") return (await readBuiltInRooms()).demo ?? null;
    return readJson(path.join(PREBUILT, `${id}.json`));
  },
  async all() {
    return Object.values(await readBuiltInRooms());
  },
};

const diskGenerated = {
  get: (id) => readJson(path.join(GENERATED, `${id}.json`)),
  async save(room) {
    await fs.mkdir(GENERATED, { recursive: true });
    await fs.writeFile(path.join(GENERATED, `${room.id}.json`), JSON.stringify(room, null, 2));
  },
  async summaries() {
    const rooms = await Promise.all((await readDir(GENERATED)).map((f) => readJson(path.join(GENERATED, f))));
    return rooms.filter(Boolean).map((room) => summarize(room, false));
  },
};

let builtIn = diskBuiltIn;
let generated = diskGenerated;

// builtIn: { get(id), all() }; generated: { get(id), save(room), summaries() }.
export function configureRoomStore(backends) {
  builtIn = backends.builtIn ?? builtIn;
  generated = backends.generated ?? generated;
}

// Saves a room and returns it with its id and createdAt filled in. Presets are
// written to data/prebuilt by scripts/prebuild.js, which only runs locally.
export async function saveRoom(room, { preset = false, id } = {}) {
  const saved = {
    ...room,
    id: id ?? room.id ?? newRoomId(room.company),
    preset,
    createdAt: room.createdAt ?? new Date().toISOString(),
  };
  if (!ID_PATTERN.test(saved.id)) throw new Error(`Invalid room id: ${saved.id}`);
  if (preset) {
    await fs.mkdir(PREBUILT, { recursive: true });
    await fs.writeFile(path.join(PREBUILT, `${saved.id}.json`), JSON.stringify(saved, null, 2));
  } else {
    await generated.save(saved);
  }
  return saved;
}

// Returns the full room (including termsText), or null if there's no such room.
export async function getRoom(id) {
  if (typeof id !== "string" || !ID_PATTERN.test(id)) return null;
  return (await builtIn.get(id)) ?? (await generated.get(id));
}

// Summaries of every stored room except the demo, nastiest terms first.
export async function listRooms() {
  const presets = (await builtIn.all()).filter((room) => room.id !== "demo").map((room) => summarize(room, true));
  const rooms = [...presets, ...(await generated.summaries())];
  return rooms.sort((a, b) => (b.dread?.score ?? -1) - (a.dread?.score ?? -1));
}
