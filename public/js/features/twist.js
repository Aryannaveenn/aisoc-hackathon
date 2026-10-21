// "We've updated our terms": mid-game, the contract quietly changes. The lights
// flicker, a new notice is nailed up in the room, and the door stays shut until
// the player reads it and spots what changed. Rooms without a usable `twist` are
// left alone. See docs/CONTRACTS.md for the room JSON and the api.

import { api, on } from "../api.js";

const TRIGGER_SOLVED = 2;        // fires once this many locks are open…
const TRIGGER_MS = 2 * 60 * 1000; // …or after this long, whichever comes first
const CLEAR_TICKS = 3;            // the room must be calm for this many polls in a row
const POLL_MS = 400;

const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
const $ = (id) => document.getElementById(id);

// Each room's terms before we touched them, so a retry starts from the original.
const pristine = new WeakMap();

const game = {
  room: null,
  twist: null,
  match: null,      // the exact span of termsText that `original` matched
  armed: false,     // this room has a usable twist
  pending: false,   // the trigger has fired; waiting for a calm moment
  fired: false,     // the terms have changed and the notice is up
  answered: false,
  timer: 0,
  poll: 0,
  calm: 0,
  notice: null,
};

/* ---------- The dialog ---------- */

const dialog = document.createElement("dialog");
dialog.id = "twist-dialog";
dialog.className = "sheet twist-sheet";
dialog.setAttribute("aria-labelledby", "twist-title");
dialog.innerHTML = `
  <form method="dialog" class="sheet-close-row"><button class="btn-close" aria-label="Close">×</button></form>
  <div class="sheet-body">
    <p id="twist-plate" class="plate twist-plate"></p>
    <h2 id="twist-title" class="sheet-title">We've updated our terms</h2>
    <p class="riddle">Two rusty nails, ink still wet. The contract changed while you were inside, and staying in the room counts as agreeing.</p>
    <p id="twist-question" class="question"></p>
    <form id="twist-form" class="lock">
      <div id="twist-choices" class="twist-choices"></div>
      <button type="submit" class="btn btn-seal">Sign that you've read it</button>
    </form>
    <p id="twist-feedback" class="feedback" role="status"></p>
    <section id="twist-reveal" class="reveal twist-reveal" hidden>
      <h3 id="twist-diff-title">What changed</h3>
      <div class="twist-diff">
        <p class="twist-before"><span class="twist-label">Before</span><del id="twist-original"></del></p>
        <p class="twist-after"><span class="twist-label">Now</span><ins id="twist-altered"></ins></p>
      </div>
      <h3>What this really means</h3>
      <p id="twist-plain"></p>
    </section>
  </div>`;
document.body.append(dialog);

function renderDialog() {
  const { twist } = game;
  const esc = api.escapeHtml;
  const ref = twist.clause_ref ? `clause ${twist.clause_ref}` : "the terms";
  $("twist-plate").textContent = twist.clause_ref ? `Updated clause ${twist.clause_ref}` : "Updated terms";
  $("twist-question").textContent = twist.question;
  $("twist-choices").innerHTML = `<fieldset class="choices"><legend class="visually-hidden">Choose an answer</legend>${twist.options
    .map((o) => `<label class="choice"><input type="radio" name="answer" value="${esc(o)}" />${esc(o)}</label>`)
    .join("")}</fieldset>`;
  $("twist-diff-title").textContent = `What changed in ${ref}`;
  $("twist-original").textContent = game.match ?? twist.original;
  $("twist-altered").textContent = twist.altered;
  $("twist-plain").textContent = twist.plain_english ?? "";
  renderAnswered();
}

function renderAnswered() {
  const done = game.answered;
  $("twist-form").hidden = done;
  $("twist-reveal").hidden = !done;
  $("twist-feedback").textContent = done ? "You caught the change." : "";
  $("twist-feedback").className = done ? "feedback good" : "feedback";
}

function openNotice() {
  if (!game.fired || api.getState().over) return;
  renderAnswered();
  dialog.showModal();
  if (!game.answered) dialog.querySelector("input[name=answer]")?.focus();
}

$("twist-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!game.fired || game.answered || api.getState().over) return;
  const answer = new FormData(e.target).get("answer");
  const feedback = $("twist-feedback");

  if (answer === null) {
    feedback.textContent = "Choose an answer first.";
    feedback.className = "feedback bad";
    return;
  }

  if (answer === game.twist.answer) {
    game.answered = true;
    playSealBreak();
    renderAnswered();
    markRead();
    $("twist-reveal").scrollIntoView({ block: "nearest", behavior: reducedMotion.matches ? "auto" : "smooth" });
    return;
  }

  await api.loseHeart("twist");
  if (api.getState().over) return;
  const { hearts } = api.getState();
  const ref = game.twist.clause_ref ? ` Check clause ${game.twist.clause_ref} in the terms.` : "";
  feedback.textContent = `Wrong. That's not what the new terms say. ${hearts} ${hearts === 1 ? "heart" : "hearts"} left.${ref}`;
  feedback.className = "feedback bad";
});

/* ---------- The notice on the wall ---------- */

const NOTICE_W = 124; // in room units (the SVG is 1200×700)
const NOTICE_H = 150;

function noticeArt() {
  // Lines of tiny "text", a little uneven, like a hurried hand.
  const lines = [44, 54, 64, 74, 84, 94]
    .map((y, i) => `<path d="M24 ${y} h${62 - ((i * 17) % 22)}" />`)
    .join("");
  return `
    <svg viewBox="0 0 120 146" aria-hidden="true" focusable="false">
      <g class="twist-paper">
        <path d="M10 8 L112 5 L114 138 L8 141 Z" fill="#e6d6ad"/>
        <path d="M10 8 L112 5 L114 138 L8 141 Z" fill="url(#twist-paper-stain)"/>
        <path d="M100 141 L114 138 L113 122 Q106 132 100 141 Z" fill="#b9a374"/>
        <text x="60" y="30" text-anchor="middle" font-family="UnifrakturCook, serif" font-size="17" fill="#8f1421">Notice</text>
        <g stroke="#2b1d12" stroke-opacity="0.55" stroke-width="2.2" stroke-linecap="round">${lines}</g>
        <path class="twist-strike" d="M22 64 h62" stroke="#8f1421" stroke-width="2.4" stroke-linecap="round"/>
      </g>
      <g class="twist-seal">
        <path d="M60 104 c9 -3 17 3 18 11 c2 9 -5 17 -14 17 c-10 1 -18 -5 -18 -14 c0 -7 6 -13 14 -14 Z" fill="#8f1421"/>
        <circle cx="61" cy="118" r="8" fill="none" stroke="#5e0b14" stroke-width="2"/>
        <path d="M57 114 l8 8 M65 114 l-8 8" stroke="#5e0b14" stroke-width="1.8"/>
        <path class="twist-crack" d="M50 108 l7 9 l-3 6 l8 9" fill="none" stroke="#e6d6ad" stroke-width="1.6"/>
      </g>
      <g fill="#4a4237" stroke="#1a1612" stroke-width="1"><circle cx="18" cy="15" r="4"/><circle cx="103" cy="12" r="4"/></g>
      <defs>
        <radialGradient id="twist-paper-stain" cx="0.75" cy="0.85" r="0.8">
          <stop offset="0.4" stop-color="#6e4614" stop-opacity="0"/>
          <stop offset="1" stop-color="#6e4614" stop-opacity="0.35"/>
        </radialGradient>
      </defs>
    </svg>`;
}

// Finds a patch of wall that doesn't cover any of the room's objects,
// as close to the exit as possible. Returns room units.
function findSpot() {
  const svg = $("room");
  const pad = 14;
  const boxes = [...svg.querySelectorAll(".hotspot")].map((el) => {
    const b = el.getBBox();
    return { x: b.x - pad, y: b.y - pad, w: b.width + pad * 2, h: b.height + pad * 2, door: el.dataset.object === "door" };
  });
  const door = boxes.find((b) => b.door);
  const target = door ? { x: door.x + door.w / 2, y: door.y + door.h * 0.45 } : { x: 600, y: 300 };
  const hits = (x, y) => boxes.some((b) => x < b.x + b.w && x + NOTICE_W > b.x && y < b.y + b.h && y + NOTICE_H > b.y);

  let best = null;
  for (let y = 16; y <= 700 - NOTICE_H - 16; y += 8) {
    for (let x = 16; x <= 1200 - NOTICE_W - 16; x += 8) {
      if (hits(x, y)) continue;
      const d = Math.hypot(x + NOTICE_W / 2 - target.x, y + NOTICE_H / 2 - target.y);
      if (!best || d < best.d) best = { x, y, d };
    }
  }
  return best ?? { x: 1200 - NOTICE_W - 24, y: 24 };
}

function showNotice() {
  const spot = findSpot();
  const el = document.createElement("button");
  el.type = "button";
  el.className = "twist-notice arriving";
  el.style.left = `${(spot.x / 1200) * 100}%`;
  el.style.top = `${(spot.y / 700) * 100}%`;
  el.style.width = `${(NOTICE_W / 1200) * 100}%`;
  el.setAttribute("aria-label", "A new notice: we've updated our terms. Read it.");
  el.innerHTML = noticeArt();
  el.addEventListener("click", openNotice);
  el.addEventListener("animationend", () => el.classList.remove("arriving"), { once: true });
  $("room-overlay").append(el);
  game.notice = el;
}

function markRead() {
  const el = game.notice;
  if (!el) return;
  el.classList.add("read");
  el.setAttribute("aria-label", "The updated notice, read. Open it to see what changed.");
}

function removeNotice() {
  game.notice?.remove();
  game.notice = null;
}

/* ---------- When it happens ---------- */

// Finds `original` in the terms, allowing for differences in whitespace.
function locate(text, original) {
  if (!text || !original) return null;
  const at = text.indexOf(original);
  if (at >= 0) return original;
  const pattern = original.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+");
  return text.match(new RegExp(pattern))?.[0] ?? null;
}

function usable(twist) {
  return Boolean(
    twist &&
      typeof twist.original === "string" &&
      typeof twist.altered === "string" &&
      twist.question &&
      Array.isArray(twist.options) &&
      twist.options.length >= 2 &&
      twist.options.includes(twist.answer),
  );
}

function calmNow() {
  const state = api.getState();
  return (
    !state.over &&
    !state.scaring &&
    !document.hidden &&
    !$("screen-game").hidden &&
    !document.querySelector("dialog[open]") &&
    !document.body.classList.contains("flicker")
  );
}

function trigger() {
  if (!game.armed || game.pending || game.fired) return;
  game.pending = true;
  clearTimeout(game.timer);
  game.calm = 0;
  game.poll = setInterval(() => {
    game.calm = calmNow() ? game.calm + 1 : 0;
    if (game.calm >= CLEAR_TICKS) {
      clearInterval(game.poll);
      fire();
    }
  }, POLL_MS);
}

function fire() {
  const room = game.room;
  game.pending = false;
  game.fired = true;
  document.body.classList.add("twist-arriving");
  api.flickerLights(1500);
  playUpdate();

  setTimeout(() => {
    if (game.room !== room || api.getState().over) return;
    const text = api.getState().room.termsText;
    api.setTermsText(text.replace(game.match, () => game.twist.altered), { highlight: game.twist.altered });
    renderDialog();
    showNotice();
    api.toast("We've updated our terms. A new notice has been nailed up in the room.", { duration: 6500 });
    setTimeout(() => document.body.classList.remove("twist-arriving"), 1500);
  }, 800);
}

function reset() {
  clearTimeout(game.timer);
  clearInterval(game.poll);
  if (dialog.open) dialog.close();
  removeNotice();
  document.body.classList.remove("twist-arriving");
  Object.assign(game, { room: null, twist: null, match: null, armed: false, pending: false, fired: false, answered: false, calm: 0 });
}

on("game:start", ({ room }) => {
  reset();
  // A retry reuses the room object, whose terms we changed last time.
  if (pristine.has(room)) api.setTermsText(pristine.get(room));
  else pristine.set(room, room.termsText);

  game.room = room;
  if (!usable(room.twist)) return;
  game.match = locate(room.termsText, room.twist.original);
  if (!game.match) return;
  game.twist = room.twist;
  game.armed = true;
  game.timer = setTimeout(trigger, TRIGGER_MS);
});

on("puzzle:solved", ({ solvedCount }) => {
  if (solvedCount >= TRIGGER_SOLVED) trigger();
});

on("game:end", reset);
on("screen:show", ({ screen }) => {
  if (screen !== "screen-game") reset();
});

on("core:ready", () => {
  api.addDoorGuard(() => {
    if (!game.armed || game.answered || api.getState().room !== game.room) return null;
    if (game.fired) return "A new notice has been nailed up in the room. Read the updated terms before you leave.";
    return "The door won't budge. Something is still rewriting the terms; look around the room first.";
  });
});

/* ---------- Sound ---------- */

function noise(ctx, seconds) {
  const buffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * seconds), ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  return buffer;
}

// A cracked bell, a sour glissando and a quill scratching out the old words.
function playUpdate() {
  const audio = api.getAudio();
  if (!audio) return;
  const { ctx, out } = audio;
  const now = ctx.currentTime;
  const master = ctx.createGain();
  master.gain.value = 0.55;
  master.connect(out);

  // The bell: inharmonic partials, each fading at its own rate.
  for (const [ratio, gain, decay] of [[1, 0.35, 5], [2.01, 0.18, 3.4], [2.76, 0.14, 2.6], [5.43, 0.07, 1.6], [8.9, 0.04, 0.9]]) {
    const osc = ctx.createOscillator();
    osc.frequency.value = 98 * ratio;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(gain, now + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, now + decay);
    osc.connect(g).connect(master);
    osc.start(now);
    osc.stop(now + decay + 0.1);
  }

  // Two voices sliding apart into a minor second, with a slow wobble.
  for (const [from, to] of [[523, 494], [523, 554]]) {
    const osc = ctx.createOscillator();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(from, now + 0.3);
    osc.frequency.exponentialRampToValueAtTime(to, now + 3);
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 5.5;
    const depth = ctx.createGain();
    depth.gain.value = 6;
    lfo.connect(depth).connect(osc.frequency);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, now + 0.3);
    g.gain.exponentialRampToValueAtTime(0.06, now + 1.4);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 3.6);
    osc.connect(g).connect(master);
    for (const n of [osc, lfo]) {
      n.start(now + 0.3);
      n.stop(now + 3.7);
    }
  }

  // The quill: short, bright scratches at an uneven pace.
  let t = now + 0.9;
  for (let i = 0; i < 9; i++) {
    const len = 0.05 + Math.random() * 0.1;
    const src = ctx.createBufferSource();
    src.buffer = noise(ctx, len);
    const band = ctx.createBiquadFilter();
    band.type = "bandpass";
    band.frequency.value = 2800 + Math.random() * 2400;
    band.Q.value = 2.5;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.22, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    src.connect(band).connect(g).connect(master);
    src.start(t);
    t += len + 0.03 + Math.random() * 0.12;
  }
}

// Snapping the wax seal: a dry crack and a low thump.
function playSealBreak() {
  const audio = api.getAudio();
  if (!audio) return;
  const { ctx, out } = audio;
  const now = ctx.currentTime;
  const src = ctx.createBufferSource();
  src.buffer = noise(ctx, 0.12);
  const high = ctx.createBiquadFilter();
  high.type = "highpass";
  high.frequency.value = 1500;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.4, now);
  g.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);
  src.connect(high).connect(g).connect(out);
  src.start(now);

  const thump = ctx.createOscillator();
  thump.frequency.setValueAtTime(140, now);
  thump.frequency.exponentialRampToValueAtTime(60, now + 0.15);
  const tg = ctx.createGain();
  tg.gain.setValueAtTime(0.3, now);
  tg.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);
  thump.connect(tg).connect(out);
  thump.start(now);
  thump.stop(now + 0.2);
}
