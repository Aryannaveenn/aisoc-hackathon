// Getting a room: the summon form and its streaming loading screen, the demo
// button, and ?room=<id> deep links. presets.js opens rooms through loadRoom().

import { api, on } from "../api.js";

const $ = (id) => document.getElementById(id);

const ID_PATTERN = /^[a-z0-9-]{1,80}$/;

// Shown when the server has gone quiet for a while.
const IDLE_LINES = [
  "Reading the fine print by candlelight…",
  "Searching for the clauses nobody reads…",
  "Waking the ghosts of past users…",
  "Hiding the door code around the room…",
  "Sharpening the arbitration clause…",
  "Counting the ways you've already agreed…",
];
const IDLE_AFTER_MS = 7000;
const IDLE_EVERY_MS = 4500;
const SCRAP_GAP_MS = 450; // scraps arrive at least this far apart, so each one lands
const EXPECTED_CLAUSES = 5;

/* ---------- Errors on the title card ---------- */

function showError(message) {
  api.showScreen("screen-title");
  const error = $("summon-error");
  error.textContent = message;
  error.hidden = false;
}

function clearError() {
  $("summon-error").hidden = true;
}

/* ---------- The loading screen ---------- */

const loading = {
  active: false,
  controller: null,
  idleTimer: 0,
  idleIndex: 0,
  queue: [],
  pinning: Promise.resolve(),
  pinned: 0,
  refs: new Set(),
};

function setLine(text) {
  $("loading-line").textContent = text;
}

// Any word from the server pushes the rotating fallback lines back.
function resetIdle() {
  clearTimeout(loading.idleTimer);
  loading.idleTimer = setTimeout(function rotate() {
    if (!loading.active) return;
    setLine(IDLE_LINES[loading.idleIndex++ % IDLE_LINES.length]);
    loading.idleTimer = setTimeout(rotate, IDLE_EVERY_MS);
  }, IDLE_AFTER_MS);
}

function startLoading({ line, note, streaming }) {
  loading.active = true;
  loading.idleIndex = 1;
  loading.pinned = 0;
  loading.refs = new Set();
  loading.pinning = Promise.resolve();
  $("loading-scraps").innerHTML = "";
  $("loading-progress").hidden = !streaming;
  $("loading-progress").innerHTML = Array.from(
    { length: EXPECTED_CLAUSES },
    () => '<span class="seal-dot" aria-hidden="true"></span>',
  ).join("") + '<span id="loading-count" class="loading-count">No clauses found yet</span>';
  $("loading-note").textContent = note;
  $("loading-note").hidden = !note;
  $("loading-cancel").hidden = !streaming;
  setLine(line);
  api.showScreen("screen-loading");
  if (streaming) resetIdle();
}

function stopLoading() {
  loading.active = false;
  clearTimeout(loading.idleTimer);
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");

// A short excerpt of a clause, cut at a word boundary.
function excerpt(quote, max = 150) {
  const text = String(quote ?? "").replace(/\s+/g, " ").trim();
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  return `${cut.slice(0, cut.lastIndexOf(" ") > 60 ? cut.lastIndexOf(" ") : max).replace(/[,;:.\s]+$/, "")}…`;
}

function renderScrap({ ref, title, quote }) {
  const li = document.createElement("li");
  li.className = "scrap";
  li.style.setProperty("--tilt", `${((loading.pinned * 37) % 7) - 3}deg`);
  const refText = ref ? `Clause ${ref}` : "A clause";
  li.innerHTML = `
    <span class="scrap-pin" aria-hidden="true"></span>
    <p class="scrap-ref">${api.escapeHtml(refText)}${title ? `<span class="scrap-title">${api.escapeHtml(title)}</span>` : ""}</p>
    ${quote ? `<blockquote class="scrap-quote">“${api.escapeHtml(excerpt(quote))}”</blockquote>` : ""}`;
  return li;
}

// Pins clauses one at a time, however quickly they arrive.
function pinClause(clause) {
  loading.refs.add(String(clause.ref ?? ""));
  loading.pinning = loading.pinning.then(async () => {
    if (!loading.active) return;
    const list = $("loading-scraps");
    list.append(renderScrap(clause));
    loading.pinned++;
    const dots = $("loading-progress").querySelectorAll(".seal-dot");
    dots[Math.min(loading.pinned, dots.length) - 1]?.classList.add("lit");
    const count = $("loading-count");
    if (count) {
      count.textContent = `${loading.pinned} ${loading.pinned === 1 ? "clause" : "clauses"} found`;
    }
    if (!reducedMotion.matches) await wait(SCRAP_GAP_MS);
  });
  return loading.pinning;
}

/* ---------- Summoning a room from the form ---------- */

// Reads an NDJSON body line by line, calling onEvent for each object.
async function readNdjson(res, onEvent) {
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  const flush = (line) => {
    if (!line.trim()) return;
    let event;
    try {
      event = JSON.parse(line);
    } catch {
      return; // a garbled line shouldn't sink the whole room
    }
    onEvent(event);
  };
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let nl;
    while ((nl = buffer.indexOf("\n")) >= 0) {
      flush(buffer.slice(0, nl));
      buffer = buffer.slice(nl + 1);
    }
  }
  flush(buffer + decoder.decode());
}

class SummonError extends Error {}

async function summon(body) {
  const controller = new AbortController();
  loading.controller = controller;
  startLoading({
    line: "Reading the fine print by candlelight…",
    note: "Building a room takes about a minute.",
    streaming: true,
  });

  try {
    const res = await fetch("/api/room", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/x-ndjson" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    const type = res.headers.get("Content-Type") ?? "";
    if (!res.ok || type.includes("application/json")) {
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.error) throw new SummonError(data.error ?? "The room couldn't be built. Try again.");
      return finish(data); // an older server that answers with the room itself
    }

    let room = null;
    let failure = null;
    await readNdjson(res, (event) => {
      if (room || failure) return;
      switch (event.type) {
        case "status":
          if (event.message) setLine(event.message);
          resetIdle();
          break;
        case "clause":
          pinClause(event);
          resetIdle();
          break;
        case "room":
          room = event.room;
          break;
        case "error":
          failure = event.error ?? "The room couldn't be built. Try again.";
          break;
        default:
          if (!event.type && event.error) failure = event.error;
      }
    });
    if (failure) throw new SummonError(failure);
    if (!room) throw new SummonError("The ritual was interrupted before the room was ready. Try again.");
    await finish(room);
  } catch (err) {
    if (controller.signal.aborted) return;
    stopLoading();
    showError(err instanceof SummonError ? err.message : "We lost contact with the other side. Check your connection and try again.");
  } finally {
    if (loading.controller === controller) loading.controller = null;
  }
}

// Fills in any clauses the stream didn't send, lets the last scrap land, then opens the room.
async function finish(room) {
  for (const p of room.puzzles ?? []) {
    if (!loading.refs.has(String(p.clause_ref ?? ""))) pinClause({ ref: p.clause_ref, title: p.title, quote: p.quote });
  }
  setLine("The room is ready. The door locks behind you…");
  clearTimeout(loading.idleTimer);
  await loading.pinning;
  if (!loading.active) return;
  await wait(reducedMotion.matches ? 200 : 900);
  if (!loading.active) return;
  stopLoading();
  api.startGame(room);
}

$("summon-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const url = $("terms-url").value.trim();
  const text = $("terms-text").value.trim();
  if (!url && !text) {
    $("summon-error").textContent = "Add a link to the terms, or paste the text.";
    $("summon-error").hidden = false;
    return;
  }
  clearError();
  api.unlockAudio();
  summon(text ? { text } : { url });
});

$("loading-cancel").addEventListener("click", () => {
  loading.controller?.abort();
  stopLoading();
  api.showScreen("screen-title");
});

/* ---------- Opening a saved room by id ---------- */

let opening = 0;

// Fetches GET /api/room/<id> and starts it. Shows the loading screen only if
// the room takes a moment, so quick loads don't flash.
export async function loadRoom(id, { from = "button" } = {}) {
  clearError();
  if (typeof id !== "string" || !ID_PATTERN.test(id)) {
    showError("That room has crumbled to dust. Summon a new one.");
    return;
  }
  const attempt = ++opening;
  const slow = setTimeout(() => {
    if (attempt === opening) startLoading({ line: "Unlocking the room…", note: "", streaming: false });
  }, from === "link" ? 0 : 250);
  try {
    const res = await fetch(`/api/room/${encodeURIComponent(id)}`);
    const data = await res.json().catch(() => ({}));
    if (attempt !== opening) return;
    if (!res.ok || !data.puzzles) {
      throw new SummonError(data.error ?? "That room has crumbled to dust. Summon a new one.");
    }
    clearTimeout(slow);
    stopLoading();
    api.startGame(data);
  } catch (err) {
    clearTimeout(slow);
    if (attempt !== opening) return;
    stopLoading();
    showError(err instanceof SummonError ? err.message : "The room wouldn't open. Check your connection and try again.");
  }
}

$("play-demo").addEventListener("click", () => {
  api.unlockAudio();
  loadRoom("demo");
});

/* ---------- Deep links ---------- */

function setRoomParam(id) {
  const url = new URL(location.href);
  if (id) url.searchParams.set("room", id);
  else url.searchParams.delete("room");
  if (url.href !== location.href) history.replaceState(history.state, "", url);
}

on("game:start", ({ room }) => {
  if (room?.id) setRoomParam(room.id);
  // Rooms opened from low on the title card would otherwise start scrolled down.
  scrollTo(0, 0);
});

on("screen:show", ({ screen }) => {
  if (screen === "screen-title") setRoomParam(null);
});

on("core:ready", () => {
  const id = new URL(location.href).searchParams.get("room");
  if (id === null) return;
  // A link opens without a click, so sound has to wait for the first gesture.
  const unlock = () => {
    api.unlockAudio();
    removeEventListener("pointerdown", unlock, true);
    removeEventListener("keydown", unlock, true);
  };
  addEventListener("pointerdown", unlock, true);
  addEventListener("keydown", unlock, true);
  loadRoom(id.trim().toLowerCase(), { from: "link" });
});
