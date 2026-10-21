// Rooms on disk. Pre-built rooms (committed) live in data/prebuilt, rooms that
// players generate live in data/generated (gitignored). The demo room is served
// from public/demo.

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

async function readJson(file) {
  try {
    return JSON.parse(await fs.readFile(file, "utf8"));
  } catch (err) {
    if (err.code === "ENOENT") return null;
    throw err;
  }
}

async function getDemo() {
  const room = await readJson(path.join(DEMO, "room.json"));
  if (!room) return null;
  const termsText = await fs.readFile(path.join(DEMO, "terms.txt"), "utf8");
  return { ...room, termsText };
}

// Saves a room and returns it with its id and createdAt filled in.
export async function saveRoom(room, { preset = false, id } = {}) {
  const saved = {
    ...room,
    id: id ?? room.id ?? newRoomId(room.company),
    preset,
    createdAt: room.createdAt ?? new Date().toISOString(),
  };
  if (!ID_PATTERN.test(saved.id)) throw new Error(`Invalid room id: ${saved.id}`);
  const dir = preset ? PREBUILT : GENERATED;
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, `${saved.id}.json`), JSON.stringify(saved, null, 2));
  return saved;
}

// Returns the full room (including termsText), or null if there's no such room.
export async function getRoom(id) {
  if (typeof id !== "string" || !ID_PATTERN.test(id)) return null;
  if (id === "demo") return getDemo();
  return (await readJson(path.join(PREBUILT, `${id}.json`))) ?? (await readJson(path.join(GENERATED, `${id}.json`)));
}

// Summaries of every stored room, nastiest terms first.
export async function listRooms() {
  const rooms = [];
  for (const [dir, preset] of [[PREBUILT, true], [GENERATED, false]]) {
    let files = [];
    try {
      files = await fs.readdir(dir);
    } catch (err) {
      if (err.code !== "ENOENT") throw err;
    }
    for (const file of files.filter((f) => f.endsWith(".json"))) {
      const room = await readJson(path.join(dir, file));
      if (!room) continue;
      rooms.push({
        id: room.id,
        company: room.company,
        theme: room.theme,
        sourceUrl: room.sourceUrl ?? null,
        dread: room.dread ? { score: room.dread.score, label: room.dread.label } : null,
        preset,
        createdAt: room.createdAt ?? null,
      });
    }
  }
  return rooms.sort((a, b) => (b.dread?.score ?? -1) - (a.dread?.score ?? -1));
}
