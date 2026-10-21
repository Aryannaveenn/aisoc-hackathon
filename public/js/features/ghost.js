// "Ask the ghost": a few questions per game to the spirit haunting the room.
// It answers from the terms, cites clauses, and won't pick the locks for you.

import { api, on } from "../api.js";

// No hints in the locks, so the ghost gets a question per lock.
const QUESTIONS = 5;
const MAX_QUESTION = 500;

const GHOSTS = {
  office: {
    name: "The solicitor's ghost",
    greeting: "Sit. Ask me about the terms I drafted and I'll tell you what they say. I won't open your locks for you, but I'll show you where to look.",
  },
  crypt: {
    name: "The crypt spirit",
    greeting: "Few come down here with questions. Ask about the terms and I'll tell you where the bodies are buried. Not the answers, though.",
  },
  parlour: {
    name: "The medium's spirit",
    greeting: "The spirits are listening. Ask about the terms and the board will spell out where to look. Not the answers. Never the answers.",
  },
  nursery: {
    name: "The nursery ghost",
    greeting: "Want to play? Ask me about the terms! I know where everything is hidden. I just won't say what it is.",
  },
};

const GHOST_SVG = `
<svg class="ghost-figure" viewBox="0 0 80 100" aria-hidden="true">
  <path class="ghost-body" d="M40 6C22 6 12 20 12 38v50l8-7 7 8 7-8 6 8 6-8 7 8 7-8 8 7V38C68 20 58 6 40 6z"/>
  <ellipse class="ghost-eye" cx="31" cy="38" rx="4.5" ry="7"/>
  <ellipse class="ghost-eye" cx="49" cy="38" rx="4.5" ry="7"/>
  <ellipse class="ghost-mouth" cx="40" cy="58" rx="5" ry="7"/>
</svg>`;

const ICON_SVG = `
<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
  <path d="M12 2.5c-4.4 0-7 3.3-7 7.6V21l2.2-1.8 2 2 1.6-2 1.2 2 1.2-2 1.6 2 2-2L19 21V10.1c0-4.3-2.6-7.6-7-7.6z" fill="currentColor"/>
  <circle cx="9.4" cy="10" r="1.4" fill="#0e1712"/><circle cx="14.6" cy="10" r="1.4" fill="#0e1712"/>
</svg>`;

const CANDLE_SVG = `
<svg class="ghost-candle" viewBox="0 0 20 44" aria-hidden="true">
  <path class="candle-flame" d="M10 2c3 4 4.5 6.5 4.5 9a4.5 4.5 0 0 1-9 0C5.5 8.5 7 6 10 2z"/>
  <path class="candle-smoke" d="M10 14c-2-3 2-5 0-8s2-4 0-6" fill="none" stroke-width="1.2" stroke-linecap="round"/>
  <rect class="candle-wick" x="9.3" y="13" width="1.4" height="4" rx="0.6"/>
  <rect class="candle-wax" x="4" y="16" width="12" height="26" rx="2"/>
</svg>`;

const $ = (sel, root = document) => root.querySelector(sel);

/* ---------- DOM ---------- */

const button = document.createElement("button");
button.type = "button";
button.className = "btn btn-small ghost-btn";
button.hidden = true;
button.innerHTML = `${ICON_SVG}<span class="ghost-btn-label">Ask the ghost</span><span class="ghost-btn-flames" aria-hidden="true"></span>`;
$("#hud-extras")?.append(button);

const dialog = document.createElement("dialog");
dialog.id = "ghost";
dialog.className = "sheet ghost-sheet";
dialog.setAttribute("aria-labelledby", "ghost-title");
dialog.innerHTML = `
  <form method="dialog" class="sheet-close-row"><button class="btn-close" aria-label="Close">×</button></form>
  <div class="sheet-body">
    <header class="ghost-head">
      <div class="ghost-window">${GHOST_SVG}</div>
      <div class="ghost-heading">
        <h2 id="ghost-title" class="sheet-title">Ask the ghost</h2>
        <p class="ghost-who"></p>
        <div class="ghost-candles" role="img"></div>
      </div>
    </header>
    <ol class="ghost-log" aria-live="polite"></ol>
    <p class="ghost-thinking" hidden>The ghost is thinking<span class="ghost-dots" aria-hidden="true"><span>.</span><span>.</span><span>.</span></span></p>
    <p class="ghost-error" role="alert" hidden></p>
    <form class="ghost-form">
      <label for="ghost-question" class="visually-hidden">Your question for the ghost</label>
      <input id="ghost-question" type="text" maxlength="${MAX_QUESTION}" autocomplete="off" placeholder="Can they delete my account?" />
      <button type="submit" class="btn btn-seal">Ask</button>
    </form>
    <p class="ghost-note">The ghost only knows what the terms say, and it won't give you the answers to the locks.</p>
  </div>`;
document.body.append(dialog);

const log = $(".ghost-log", dialog);
const form = $(".ghost-form", dialog);
const input = $("#ghost-question", dialog);
const askBtn = $(".ghost-form button", dialog);
const thinking = $(".ghost-thinking", dialog);
const errorLine = $(".ghost-error", dialog);
const candles = $(".ghost-candles", dialog);
const who = $(".ghost-who", dialog);

/* ---------- State ---------- */

let remaining = QUESTIONS;
let history = [];
let busy = false;
let controller = null;
let ghost = GHOSTS.office;

function roomId() {
  return api.getState?.().room?.id ?? null;
}

function render() {
  const faded = remaining <= 0;
  candles.innerHTML = Array.from({ length: QUESTIONS }, (_, i) =>
    `<span class="ghost-candle-wrap${i < remaining ? "" : " out"}">${CANDLE_SVG}</span>`,
  ).join("");
  const left = faded
    ? "The candles are out"
    : `${remaining} ${remaining === 1 ? "question" : "questions"} left`;
  candles.setAttribute("aria-label", left);
  candles.dataset.left = left;

  button.querySelector(".ghost-btn-flames").innerHTML = Array.from({ length: QUESTIONS }, (_, i) =>
    `<span class="ghost-btn-flame${i < remaining ? "" : " out"}"></span>`,
  ).join("");
  button.classList.toggle("is-faded", faded);
  button.setAttribute("aria-label", faded ? "The ghost has faded" : `Ask the ghost, ${left}`);
  button.title = faded ? "The ghost has faded" : `Ask the ghost (${left})`;

  dialog.classList.toggle("faded", faded);
  dialog.classList.toggle("thinking", busy);
  thinking.hidden = !busy;
  input.disabled = busy || faded;
  askBtn.disabled = busy || faded;
  input.placeholder = faded ? "The ghost has faded" : "Can they delete my account?";
}

// Turns "clause 4.2" or "section 8" into a link that opens the terms there.
function withCitations(text) {
  const safe = api.escapeHtml(text);
  return safe.replace(
    /\b((?:clauses?|sections?|§)\s*)(\d+(?:\.\d+)*)((?:\s*(?:,|and|or|&amp;|to)\s*\d+(?:\.\d+)*)*)/gi,
    (match, lead, first, rest) => {
      const cite = (ref) => `<button type="button" class="ghost-cite" data-ref="${ref}">${ref}</button>`;
      return lead + cite(first) + rest.replace(/\d+(?:\.\d+)*/g, cite);
    },
  );
}

function addLine(from, text) {
  const li = document.createElement("li");
  li.className = `ghost-line from-${from}`;
  const speaker = from === "ghost" ? ghost.name : "You";
  li.innerHTML = `<span class="ghost-speaker">${api.escapeHtml(speaker)}</span><p>${from === "ghost" ? withCitations(text) : api.escapeHtml(text)}</p>`;
  log.append(li);
  li.scrollIntoView({ block: "nearest" });
  return li;
}

function reset(room) {
  controller?.abort();
  controller = null;
  busy = false;
  remaining = QUESTIONS;
  history = [];
  ghost = GHOSTS[room?.theme] ?? GHOSTS.office;
  who.textContent = `${ghost.name} haunts this room. Every question burns a candle.`;
  log.innerHTML = "";
  addLine("ghost", ghost.greeting);
  errorLine.hidden = true;
  input.value = "";
  button.hidden = !room?.id;
  if (dialog.open) dialog.close();
  render();
}

/* ---------- Asking ---------- */

async function ask(question) {
  const id = roomId();
  if (!id || busy || remaining <= 0) return;
  errorLine.hidden = true;
  busy = true;
  render();
  addLine("you", question);
  const mine = (controller = new AbortController());

  try {
    const res = await fetch("/api/ghost", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roomId: id, question, history }),
      signal: mine.signal,
    });
    const body = await res.json().catch(() => ({}));
    if (mine !== controller) return;
    if (!res.ok || typeof body.answer !== "string") {
      throw new Error(body.error || "The ghost couldn't hear you. Try again in a moment.");
    }
    history = [...history, { role: "user", content: question }, { role: "assistant", content: body.answer }].slice(-10);
    remaining -= 1;
    addLine("ghost", body.answer);
    if (remaining <= 0) {
      const li = addLine("ghost", "The last candle gutters out. I'm going back into the fine print. Read it yourself now.");
      li.classList.add("farewell");
    }
  } catch (err) {
    if (mine !== controller || err.name === "AbortError") return;
    // A failed question costs nothing: take the unanswered line back.
    log.lastElementChild?.remove();
    input.value = question;
    errorLine.textContent = err.message;
    errorLine.hidden = false;
  } finally {
    if (mine === controller) {
      busy = false;
      controller = null;
      render();
      if (remaining > 0) input.focus();
    }
  }
}

form.addEventListener("submit", (e) => {
  e.preventDefault();
  const q = input.value.trim().slice(0, MAX_QUESTION);
  if (!q) return input.focus();
  input.value = "";
  ask(q);
});

// A cited clause opens the terms, searched to that clause.
log.addEventListener("click", (e) => {
  const cite = e.target.closest(".ghost-cite");
  if (!cite) return;
  const ref = cite.dataset.ref;
  dialog.close();
  document.getElementById("open-contract")?.click();
  const search = document.getElementById("contract-search");
  if (!search) return;
  // "8" alone would match every 8 in the terms; "8." finds the heading first.
  search.value = ref.includes(".") ? ref : `${ref}.`;
  search.dispatchEvent(new Event("input", { bubbles: true }));
});

function open(question = "") {
  if (!roomId()) return;
  if (question && !input.disabled && !input.value.trim()) input.value = question.slice(0, MAX_QUESTION);
  if (!dialog.open) dialog.showModal();
  if (!input.disabled) input.focus();
  log.lastElementChild?.scrollIntoView({ block: "nearest" });
}

button.addEventListener("click", () => open());
// A lock's "Ask the ghost" button: open with its question typed in, unsent.
on("ghost:summon", ({ question }) => open(question));

on("game:start", ({ room }) => reset(room));
on("game:end", () => {
  controller?.abort();
  controller = null;
  busy = false;
  render();
});
on("screen:show", ({ screen }) => {
  if (screen !== "screen-game" && dialog.open) dialog.close();
});

render();
