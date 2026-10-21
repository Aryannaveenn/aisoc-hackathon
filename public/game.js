// Terms of Dread: the core game. Features live in js/features/ and talk to
// this file through js/api.js; see docs/CONTRACTS.md.

import { api, emit } from "./js/api.js";
import { getTheme } from "./js/rooms/index.js";
import "./js/features/index.js";

const NUMERALS = ["I", "II", "III", "IV", "V"];

const $ = (id) => document.getElementById(id);

const state = {
  room: null,
  theme: getTheme("office"),
  maxHearts: 5,
  hearts: 5,
  solved: new Set(),
  hintsShown: {},
  startedAt: 0,
  timer: 0,
  sound: true,
  over: false,
  scaring: false,
  current: null,
};

const doorGuards = [];

/* ---------- Screens ---------- */

function show(screen) {
  document.documentElement.classList.remove("deep-link");
  for (const id of ["screen-title", "screen-loading", "screen-game"]) {
    $(id).hidden = id !== screen;
  }
  emit("screen:show", { screen });
}

/* ---------- Game lifecycle ---------- */

// Nastier terms leave you fewer hearts.
function heartsFor(room) {
  const score = room.dread?.score;
  if (typeof score !== "number") return 5;
  if (score >= 70) return 3;
  if (score >= 40) return 4;
  return 5;
}

function startGame(room) {
  unlockAudio();
  state.room = room;
  state.theme = getTheme(room.theme);
  state.maxHearts = heartsFor(room);
  state.hearts = state.maxHearts;
  state.solved = new Set();
  state.hintsShown = {};
  state.termsHighlight = null;
  state.over = false;
  state.startedAt = Date.now();
  nextScare = makeDeck(SCARES.length);
  nextScream = makeDeck(SCREAM_FILES.length);
  clearInterval(state.timer);

  $("hud-company").textContent = room.company;
  $("intro").textContent = room.intro;
  $("contract-search").value = "";
  renderTimer();
  renderHearts();
  buildRoom();
  renderContract("");
  preloadScares();
  show("screen-game");
  // Ask once per visit; retries go straight in.
  if (warned) beginPlay();
  else $("listen-warning").showModal();
}

let warned = false;
$("listen-warning").addEventListener("close", () => {
  warned = true;
  beginPlay();
});

// The clock and the music wait until the player says they're ready.
function beginPlay() {
  state.startedAt = Date.now();
  state.timer = setInterval(renderTimer, 1000);
  renderTimer();
  startAmbience();
  emit("game:start", { room: state.room, theme: state.theme.id, maxHearts: state.maxHearts });
}

function elapsed() {
  const s = Math.floor((Date.now() - state.startedAt) / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

function renderTimer() {
  $("timer").textContent = elapsed();
}

const HEART_PATH = "M12 21s-7.5-4.6-9.6-9.3C.9 8.4 3 4.5 6.6 4.5c2.1 0 3.5 1.2 4.4 2.6.9-1.4 2.3-2.6 4.4-2.6 3.6 0 5.7 3.9 4.2 7.2C19.5 16.4 12 21 12 21z";

function renderHearts(breakingIndex = -1) {
  const wrap = $("hearts");
  wrap.innerHTML = "";
  wrap.setAttribute("aria-label", `${state.hearts} of ${state.maxHearts} hearts remaining`);
  for (let i = 0; i < state.maxHearts; i++) {
    const lost = i >= state.hearts;
    wrap.insertAdjacentHTML(
      "beforeend",
      `<svg class="heart${lost ? " lost" : ""}${i === breakingIndex ? " breaking" : ""}" viewBox="0 0 24 24" aria-hidden="true">
        <path d="${HEART_PATH}" fill="currentColor"/>
        ${lost ? '<path d="M12 7l-1.5 4 2.5 2-2 4" fill="none" stroke="#0e1712" stroke-width="1.6"/>' : ""}
      </svg>`,
    );
  }
}

function endGame(won) {
  state.over = true;
  clearInterval(state.timer);
  stopAmbience();
  for (const d of document.querySelectorAll("dialog[open]")) if (d.id !== "ending") d.close();

  const title = $("ending-title");
  title.textContent = won ? "You escaped" : "Bound by the terms";
  title.classList.toggle("won", won);
  const time = elapsed();
  $("ending-text").textContent = won
    ? `You read the fine print and escaped ${state.room.company}'s ${state.theme.name.replace(/^The /, "")} in ${time} with ${state.hearts} of ${state.maxHearts} hearts left. Most people never get this far: they just click "I agree".`
    : `Your last heart gave out. Like everyone else who never read the terms, you belong to ${state.room.company} now. The good news: you can still find out what you agreed to.`;
  $("ending-verdict").innerHTML = state.room.verdict.map((v) => `<li>${escapeHtml(v)}</li>`).join("");
  $("ending-extras").innerHTML = "";
  $("ending").showModal();
  emit("game:end", {
    won,
    room: state.room,
    theme: state.theme.id,
    hearts: state.hearts,
    maxHearts: state.maxHearts,
    time,
    seconds: Math.floor((Date.now() - state.startedAt) / 1000),
  });
}

$("retry").addEventListener("click", () => {
  $("ending").close();
  startGame(state.room);
});
$("new-room").addEventListener("click", () => {
  $("ending").close();
  clearInterval(state.timer);
  show("screen-title");
});

/* ---------- The room ---------- */

function plate(index, x, y) {
  return `
    <g transform="translate(${x} ${y})">
      <rect x="-26" y="-14" width="52" height="28" rx="3" fill="#b08d3e" stroke="#6e5420"/>
      <text x="0" y="6" text-anchor="middle" font-family="IM Fell English, serif" font-size="17" fill="#2a1c06">${NUMERALS[index]}</text>
      <g class="plate-digit">
        <rect x="-16" y="18" width="32" height="34" rx="3" fill="#2b1d12" stroke="#f2a63a"/>
        <text class="digit-text" x="0" y="44" text-anchor="middle" font-family="IM Fell English, serif" font-size="26" fill="#f2a63a"></text>
      </g>
    </g>`;
}

function hotspotFrame(object, label, box, art) {
  const [x, y, w, h] = box;
  return `
    <g class="hotspot${object === "door" ? " door" : ""}" data-object="${object}" tabindex="0" role="button" aria-label="${escapeHtml(label)}">
      <rect class="glow" x="${x - 8}" y="${y - 8}" width="${w + 16}" height="${h + 16}" rx="10" fill="rgb(179 242 138 / 0.07)" stroke="#b3f28a" stroke-opacity="0.5" stroke-dasharray="6 6"/>
      ${art}
      <rect class="outline" x="${x - 8}" y="${y - 8}" width="${w + 16}" height="${h + 16}" rx="10" fill="transparent" stroke="none"/>
    </g>`;
}

const objectIndex = (id) => state.theme.objects.findIndex((o) => o.id === id);

function hotspot(object, box, art) {
  const i = objectIndex(object);
  if (i < 0) throw new Error(`Theme ${state.theme.id} has no object "${object}"`);
  return hotspotFrame(object, `${state.theme.objects[i].name}, lock ${NUMERALS[i]}`, box, art);
}

function door(box, art) {
  return hotspotFrame("door", state.theme.exitName ?? "The exit", box, art);
}

let unmountTheme = null;

function buildRoom() {
  unmountTheme?.();
  const room = $("room");
  room.innerHTML = state.theme.render({ hotspot, plate, door });
  room.setAttribute("aria-label", `${state.theme.name}. Choose an object to search it.`);
  room.classList.remove("door-ready");
  $("screen-game").dataset.theme = state.theme.id;

  for (const el of room.querySelectorAll(".hotspot")) {
    const open = () => (el.dataset.object === "door" ? openDoor() : openPuzzle(el.dataset.object));
    el.addEventListener("click", open);
    el.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        open();
      }
    });
  }
  unmountTheme = state.theme.mount?.(room) ?? null;
}

function markSolved(object) {
  const index = objectIndex(object);
  const puzzle = state.room.puzzles[index];
  const el = document.querySelector(`.hotspot[data-object="${object}"]`);
  el.classList.add("solved");
  el.querySelector(".digit-text").textContent = puzzle.digit;
  el.setAttribute("aria-label", `${state.theme.objects[index].name}, lock ${NUMERALS[index]}, opened. Digit ${puzzle.digit}`);
  if (state.solved.size === state.theme.objects.length) $("room").classList.add("door-ready");
  emit("puzzle:solved", { index, object, solvedCount: state.solved.size });
}

/* ---------- Notices ---------- */

let toastTimer = 0;
function toast(message, { duration = 4000 } = {}) {
  // A popover, so it shows above any open modal dialog.
  const el = $("toast");
  el.textContent = message;
  if (el.matches(":popover-open")) el.hidePopover();
  el.showPopover();
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.hidePopover(), duration);
}

function flickerLights(ms = 700) {
  document.body.classList.remove("flicker");
  void document.body.offsetWidth;
  document.body.style.setProperty("--flicker-ms", `${ms}ms`);
  document.body.classList.add("flicker");
  setTimeout(() => document.body.classList.remove("flicker"), ms);
}

/* ---------- Puzzles ---------- */

function normalize(s) {
  return String(s)
    .toLowerCase()
    .replace(/[‘’]/g, "'")
    .replace(/[£$€%]/g, "")
    .replace(/[^\p{L}\p{N}\s']/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^(the|a|an) /, "");
}

function isCorrect(puzzle, input) {
  if (puzzle.kind === "choice") return input === puzzle.answer;
  const guess = normalize(input);
  if (!guess) return false;
  const accepted = [puzzle.answer, ...puzzle.accepted].map(normalize);
  if (accepted.includes(guess) || accepted.includes(guess.replace(/ /g, ""))) return true;
  if (puzzle.kind === "number") {
    const digits = guess.match(/\d+(\.\d+)?/)?.[0];
    return digits !== undefined && digits === normalize(puzzle.answer).match(/\d+(\.\d+)?/)?.[0];
  }
  return false;
}

function openPuzzle(object) {
  if (state.over) return;
  const index = objectIndex(object);
  const puzzle = state.room.puzzles[index];
  const solved = state.solved.has(object);
  state.current = object;

  $("puzzle-plate").textContent = `Lock ${NUMERALS[index]}`;
  $("puzzle-title").textContent = puzzle.title;
  $("puzzle-riddle").textContent = puzzle.riddle;
  $("puzzle-question").textContent = puzzle.question;

  const input = $("puzzle-input");
  if (puzzle.kind === "choice") {
    input.innerHTML = `<fieldset class="choices"><legend class="visually-hidden">Choose an answer</legend>${puzzle.options
      .map((o) => `<label class="choice"><input type="radio" name="answer" value="${escapeHtml(o)}" />${escapeHtml(o)}</label>`)
      .join("")}</fieldset>`;
  } else {
    input.innerHTML = `<label for="answer-text" class="visually-hidden">Your answer</label>
      <input id="answer-text" type="text" name="answer" autocomplete="off" ${puzzle.kind === "number" ? 'inputmode="numeric" placeholder="A number"' : 'placeholder="A word or short phrase"'} />`;
  }

  $("puzzle-form").hidden = solved;
  $("hint-btn").parentElement.hidden = solved;
  $("puzzle-feedback").textContent = solved ? "This lock is already open." : "";
  $("puzzle-feedback").className = solved ? "feedback good" : "feedback";
  renderHints(puzzle);
  renderReveal(puzzle, solved);

  $("puzzle").showModal();
  if (!solved) input.querySelector("input")?.focus();
  emit("puzzle:open", { index, object, solved });
}

function renderHints(puzzle) {
  const shown = state.hintsShown[state.current] ?? 0;
  $("hint-list").innerHTML = puzzle.hints.slice(0, shown).map((h) => `<li>${escapeHtml(h)}</li>`).join("");
  $("hint-btn").hidden = shown >= puzzle.hints.length;
  $("hint-btn").textContent = shown === 0 ? "Get a hint" : "Get another hint";
}

function renderReveal(puzzle, solved) {
  $("puzzle-reveal").hidden = !solved;
  if (!solved) return;
  $("reveal-quote").textContent = puzzle.quote;
  $("reveal-ref").textContent = `Clause ${puzzle.clause_ref}${puzzle.verified ? "" : " (paraphrased, so check the original wording)"}`;
  $("reveal-plain").textContent = puzzle.plain_english;
  $("reveal-digit").textContent = puzzle.digit;
}

$("hint-btn").addEventListener("click", () => {
  const puzzle = state.room.puzzles[objectIndex(state.current)];
  state.hintsShown[state.current] = (state.hintsShown[state.current] ?? 0) + 1;
  renderHints(puzzle);
});

$("puzzle-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  if (state.over) return;
  const object = state.current;
  const puzzle = state.room.puzzles[objectIndex(object)];
  const answer = new FormData(e.target).get("answer");
  const feedback = $("puzzle-feedback");

  if (answer === null || !String(answer).trim()) {
    feedback.textContent = puzzle.kind === "choice" ? "Choose an answer first." : "Write an answer first.";
    feedback.className = "feedback bad";
    return;
  }

  if (isCorrect(puzzle, String(answer))) {
    state.solved.add(object);
    playClick();
    feedback.textContent = "The lock clicks open.";
    feedback.className = "feedback good";
    $("puzzle-form").hidden = true;
    $("hint-btn").parentElement.hidden = true;
    renderReveal(puzzle, true);
    markSolved(object);
    return;
  }

  emit("answer:wrong", { index: objectIndex(object), object });
  await loseHeart("puzzle");
  if (state.over) return;
  feedback.textContent = `Wrong. That's not what the terms say. ${state.hearts} ${state.hearts === 1 ? "heart" : "hearts"} left.`;
  feedback.className = "feedback bad";
});

/* ---------- The door ---------- */

function openDoor() {
  if (state.over) return;
  const objects = state.theme.objects;
  const found = state.room.puzzles.map((p, i) => (state.solved.has(objects[i].id) ? p.digit : "_")).join(" ");
  const remaining = objects.length - state.solved.size;
  const blocked = doorGuards.map((guard) => guard()).filter(Boolean);
  $("door-text").textContent =
    (remaining === 0
      ? `Five digits, five brass plates. Enter them in order from I to V. Digits found: ${found}`
      : `The lock wants five digits. ${remaining} ${remaining === 1 ? "lock is" : "locks are"} still closed, so a guess is likely to cost you. Digits found: ${found}`) +
    (blocked.length ? ` ${blocked.join(" ")}` : "");
  $("door-feedback").textContent = "";
  $("door-feedback").className = "feedback";
  $("door-code").value = "";
  $("door").showModal();
  $("door-code").focus();
}

$("door-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  if (state.over) return;
  const code = $("door-code").value.replace(/\D/g, "");
  if (code.length !== 5) {
    $("door-feedback").textContent = "The code is five digits.";
    $("door-feedback").className = "feedback bad";
    return;
  }
  if (code === state.room.doorCode) {
    const blocked = doorGuards.map((guard) => guard()).find(Boolean);
    if (blocked) {
      $("door-feedback").textContent = blocked;
      $("door-feedback").className = "feedback bad";
      return;
    }
    playClick();
    endGame(true);
    return;
  }
  emit("answer:wrong", { index: -1, object: "door" });
  await loseHeart("door");
  if (state.over) return;
  $("door-feedback").textContent = `The key won't turn. ${state.hearts} ${state.hearts === 1 ? "heart" : "hearts"} left.`;
  $("door-feedback").className = "feedback bad";
});

/* ---------- Contract reader ---------- */

$("open-contract").addEventListener("click", () => {
  $("contract").showModal();
  $("contract-search").focus();
});

let searchDebounce = 0;
$("contract-search").addEventListener("input", (e) => {
  clearTimeout(searchDebounce);
  searchDebounce = setTimeout(() => renderContract(e.target.value), 150);
});

function renderContract(query) {
  const text = state.room?.termsText ?? "";
  const box = $("contract-text");
  const q = query.trim();
  if (q.length < 2) {
    const mark = state.termsHighlight;
    const at = mark ? text.indexOf(mark) : -1;
    if (at < 0) box.textContent = text;
    else box.innerHTML = `${escapeHtml(text.slice(0, at))}<mark class="changed">${escapeHtml(mark)}</mark>${escapeHtml(text.slice(at + mark.length))}`;
    $("contract-count").textContent = "";
    return;
  }
  const pattern = new RegExp(escapeHtml(q).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
  let count = 0;
  box.innerHTML = escapeHtml(text).replace(pattern, (m) => {
    count++;
    return `<mark>${m}</mark>`;
  });
  $("contract-count").textContent = count ? `${count} ${count === 1 ? "match" : "matches"}` : `No matches for "${q}"`;
  box.querySelector("mark")?.scrollIntoView({ block: "center" });
}

/* ---------- Jumpscares ---------- */

// One per heart, shuffled each game so every wrong answer shows a different
// face. Public-domain and CC0 film stills; see public/assets/CREDITS.md.
const SCARES = [
  { src: "assets/scares/2-nun.jpg", focus: "50% 45%" },
  { src: "assets/scares/3-orlok.jpg", focus: "52% 30%" },
  { src: "assets/scares/4-devil.jpg", focus: "50% 35%" },
  { src: "assets/scares/6-satan.jpg", focus: "50% 22%" },
  { src: "assets/scares/11-chaney.jpg", focus: "60% 25%" },
];

function shuffled(n) {
  const order = [...Array(n).keys()];
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}

// Draws without repeats until the deck runs out, then reshuffles, never
// putting the last card drawn on top.
function makeDeck(n) {
  let cards = [];
  let last = -1;
  return () => {
    if (!cards.length) {
      cards = shuffled(n);
      if (n > 1 && cards[0] === last) cards.push(cards.shift());
    }
    return (last = cards.shift());
  };
}

let nextScare = makeDeck(SCARES.length);

const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

function preloadScares() {
  for (const s of SCARES) new Image().src = s.src;
}

async function jumpscare(level) {
  const scare = $("scare");
  const { src, focus } = SCARES[nextScare()];
  const final = level >= 5;
  const hitMs = 900 + level * 180 + (final ? 600 : 0);
  const calm = reducedMotion.matches;

  // The dread: the lights die, the music cuts out, a heartbeat. Then it hits.
  state.scaring = true;
  emit("scare:start", { level });
  duckAmbience();
  document.body.classList.add("lights-out");
  playHeartbeat(level);
  await wait(320 + level * 70);

  for (const img of scare.querySelectorAll(".scare-img")) {
    img.src = src;
    img.style.objectPosition = focus;
  }
  $("scare-text").textContent = final ? "You agreed." : "";
  scare.className = `scare level-${level}`;
  scare.style.setProperty("--hit-ms", `${hitMs}ms`);
  scare.showModal();
  void scare.offsetWidth; // restart the animations
  scare.classList.add("hit");
  if (!calm) document.body.classList.add("shake");
  playScare(level, hitMs / 1000);
  navigator.vibrate?.([200, 60, 300, 60, 400]);

  // Jitter the frame like a projector slipping its sprockets.
  let jitter = 0;
  if (!calm) {
    let frame = 0;
    jitter = setInterval(() => {
      frame++;
      const amp = 6 + level * 4;
      scare.style.setProperty("--jx", `${(Math.random() - 0.5) * amp}px`);
      scare.style.setProperty("--jy", `${(Math.random() - 0.5) * amp}px`);
      scare.style.setProperty("--split", `${4 + Math.random() * level * 5}px`);
      // At most two inverted frames per scare, well under three flashes a second.
      scare.classList.toggle("invert", level >= 2 && (frame === 3 || frame === 11));
    }, 55);
  }

  await wait(hitMs);
  clearInterval(jitter);
  scare.close();
  scare.className = "scare";
  document.body.classList.remove("shake", "lights-out");
  restoreAmbience();
  state.scaring = false;
  emit("scare:end", { level });
}
// Escape shouldn't skip a scare.
$("scare").addEventListener("cancel", (e) => e.preventDefault());

// Scares escalate to the worst one on the last heart, however many you started with.
async function loseHeart(cause = "puzzle") {
  state.hearts -= 1;
  const lost = state.maxHearts - state.hearts;
  const level = state.hearts <= 0 ? 5 : Math.max(1, Math.min(4, Math.round((lost / state.maxHearts) * 5)));
  emit("heart:lost", { hearts: state.hearts, maxHearts: state.maxHearts, cause });
  await jumpscare(level);
  renderHearts(state.hearts);
  if (state.hearts <= 0) endGame(false);
}

/* ---------- Sound ---------- */

let audio = null;
let mainOut = null;   // everything goes through here, so mute is one switch
let scareBus = null;  // the jumpscare amp: boost, limit, clip
let ambience = null;
const samples = [];

// One scream per heart, shuffled like the faces so each wrong answer sounds different.
const SCREAM_FILES = [
  "assets/sounds/sound_effects75-eyesaur-jumpscare-sound-482110.mp3",
  "assets/sounds/demonic-scream.mp3",
  "assets/sounds/ahhh-scream.mp3",
  "assets/sounds/now-screaming.mp3",
  "assets/sounds/cri-wilhelm.wav",
];
let nextScream = makeDeck(SCREAM_FILES.length);

function unlockAudio() {
  if (!audio) {
    try {
      audio = new AudioContext();
    } catch {
      return;
    }
    mainOut = audio.createGain();
    mainOut.gain.value = state.sound ? 1 : 0;
    mainOut.connect(audio.destination);
    scareBus = buildScareBus();
    loadSamples();
  }
  audio.resume();
}

// Speakers can't go past full scale, so "louder" means pinning everything at
// the ceiling: a big boost, a brick-wall limiter, and a soft clipper for grit.
function buildScareBus() {
  const boost = audio.createGain();
  boost.gain.value = 12;
  const limiter = audio.createDynamicsCompressor();
  limiter.threshold.value = -20;
  limiter.knee.value = 0;
  limiter.ratio.value = 20;
  limiter.attack.value = 0.001;
  limiter.release.value = 0.2;
  const makeup = audio.createGain();
  makeup.gain.value = 4;
  const clipper = audio.createWaveShaper();
  const curve = new Float32Array(2048);
  for (let i = 0; i < curve.length; i++) curve[i] = Math.tanh(((i / curve.length) * 2 - 1) * 3);
  clipper.curve = curve;
  clipper.oversample = "4x";
  boost.connect(limiter).connect(makeup).connect(clipper).connect(mainOut);
  return boost;
}

async function loadSamples() {
  await Promise.all(
    SCREAM_FILES.map(async (url, i) => {
      try {
        const data = await fetch(url).then((r) => r.arrayBuffer());
        samples[i] = await audio.decodeAudioData(data);
      } catch {
        // The synthesised layers still play without the sample.
      }
    }),
  );
}

function playSample(index, { rate = 1, gain = 1, at = 0 } = {}) {
  const buffer = samples[index];
  if (!buffer) return;
  const src = audio.createBufferSource();
  src.buffer = buffer;
  src.playbackRate.value = rate;
  const g = audio.createGain();
  g.gain.value = gain;
  src.connect(g).connect(scareBus);
  src.start(audio.currentTime + at);
}

function noiseBuffer(seconds) {
  const buffer = audio.createBuffer(1, Math.ceil(audio.sampleRate * seconds), audio.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  return buffer;
}

function playScare(level, seconds) {
  if (!audio) return;
  const now = audio.currentTime;

  // A different real scream each time, pitched a little lower as the hearts run out.
  playSample(nextScream(), { rate: 1.04 - level * 0.06 });

  // A synthetic shriek under the scream: detuned saws sliding down.
  const shriek = audio.createGain();
  shriek.gain.setValueAtTime(0.0001, now);
  shriek.gain.exponentialRampToValueAtTime(0.25, now + 0.02);
  shriek.gain.exponentialRampToValueAtTime(0.0001, now + seconds);
  shriek.connect(scareBus);
  for (const detune of [-40, -12, 0, 19, 45]) {
    const osc = audio.createOscillator();
    osc.type = "sawtooth";
    osc.detune.value = detune;
    osc.frequency.setValueAtTime(900 + level * 140, now);
    osc.frequency.exponentialRampToValueAtTime(70, now + seconds);
    osc.connect(shriek);
    osc.start(now);
    osc.stop(now + seconds);
  }

  // A burst of static.
  const noise = audio.createBufferSource();
  noise.buffer = noiseBuffer(seconds);
  const band = audio.createBiquadFilter();
  band.type = "bandpass";
  band.frequency.setValueAtTime(3000, now);
  band.frequency.exponentialRampToValueAtTime(500, now + seconds);
  const ng = audio.createGain();
  ng.gain.setValueAtTime(0.6, now);
  ng.gain.exponentialRampToValueAtTime(0.0001, now + seconds);
  noise.connect(band).connect(ng).connect(scareBus);
  noise.start(now);

  // The orchestra hit: a dissonant cluster stab with a sub-bass drop.
  for (const f of [110, 116.5, 155.6, 233]) {
    const osc = audio.createOscillator();
    osc.type = "square";
    osc.frequency.value = f;
    const g = audio.createGain();
    g.gain.setValueAtTime(0.15, now);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.9);
    osc.connect(g).connect(scareBus);
    osc.start(now);
    osc.stop(now + 1);
  }
  const sub = audio.createOscillator();
  sub.frequency.setValueAtTime(120, now);
  sub.frequency.exponentialRampToValueAtTime(28, now + 0.6);
  const sg = audio.createGain();
  sg.gain.setValueAtTime(1, now);
  sg.gain.exponentialRampToValueAtTime(0.0001, now + 0.7);
  sub.connect(sg).connect(scareBus);
  sub.start(now);
  sub.stop(now + 0.75);
}

function playHeartbeat(level) {
  if (!audio) return;
  const now = audio.currentTime;
  for (const t of [0, 0.16]) {
    const osc = audio.createOscillator();
    osc.frequency.setValueAtTime(58, now + t);
    osc.frequency.exponentialRampToValueAtTime(38, now + t + 0.12);
    const g = audio.createGain();
    g.gain.setValueAtTime(0.0001, now + t);
    g.gain.exponentialRampToValueAtTime(0.5 + level * 0.08, now + t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, now + t + 0.14);
    osc.connect(g).connect(mainOut);
    osc.start(now + t);
    osc.stop(now + t + 0.15);
  }
}

/* The ambience: a low drone, wind, and a music box that's slightly out of tune. */

function startAmbience() {
  if (!audio || ambience) return;
  const now = audio.currentTime;
  const out = audio.createGain();
  out.gain.setValueAtTime(0.0001, now);
  out.gain.exponentialRampToValueAtTime(0.35, now + 4);
  out.connect(mainOut);

  const nodes = [];
  for (const [f, type, gain] of [[55, "sine", 0.4], [55.6, "sine", 0.4], [82.4, "triangle", 0.12], [116.5, "sine", 0.06]]) {
    const osc = audio.createOscillator();
    osc.type = type;
    osc.frequency.value = f;
    const g = audio.createGain();
    g.gain.value = gain;
    osc.connect(g).connect(out);
    osc.start();
    nodes.push(osc);
  }

  // Wind: looping noise through a bandpass that drifts with a slow LFO.
  const wind = audio.createBufferSource();
  wind.buffer = noiseBuffer(4);
  wind.loop = true;
  const band = audio.createBiquadFilter();
  band.type = "bandpass";
  band.frequency.value = 500;
  band.Q.value = 1.4;
  const lfo = audio.createOscillator();
  lfo.frequency.value = 0.07;
  const lfoDepth = audio.createGain();
  lfoDepth.gain.value = 350;
  lfo.connect(lfoDepth).connect(band.frequency);
  const wg = audio.createGain();
  wg.gain.value = 0.22;
  wind.connect(band).connect(wg).connect(out);
  wind.start();
  lfo.start();
  nodes.push(wind, lfo);

  // A music box picking notes from a minor scale, a little detuned.
  const scale = [659.3, 698.5, 784, 880, 987.8, 1046.5, 1318.5];
  const pluck = () => {
    if (!ambience) return;
    const t = audio.currentTime;
    const osc = audio.createOscillator();
    osc.type = "sine";
    osc.frequency.value = scale[Math.floor(Math.random() * scale.length)];
    osc.detune.value = (Math.random() - 0.5) * 30;
    const g = audio.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.09, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 2.4);
    osc.connect(g).connect(out);
    osc.start(t);
    osc.stop(t + 2.5);
    ambience.timer = setTimeout(pluck, 600 + Math.random() * (Math.random() < 0.3 ? 5000 : 900));
  };

  ambience = { out, nodes, timer: 0 };
  ambience.timer = setTimeout(pluck, 2500);
}

function stopAmbience() {
  if (!ambience) return;
  const { out, nodes, timer } = ambience;
  ambience = null;
  clearTimeout(timer);
  out.gain.setTargetAtTime(0.0001, audio.currentTime, 0.3);
  setTimeout(() => nodes.forEach((n) => n.stop()), 2000);
}

function duckAmbience() {
  ambience?.out.gain.setTargetAtTime(0.0001, audio.currentTime, 0.04);
}

function restoreAmbience() {
  ambience?.out.gain.setTargetAtTime(0.35, audio.currentTime + 1.5, 1.2);
}

function playClick() {
  if (!audio) return;
  const now = audio.currentTime;
  for (const [t, f] of [[0, 1800], [0.07, 1200]]) {
    const osc = audio.createOscillator();
    osc.type = "square";
    osc.frequency.value = f;
    const g = audio.createGain();
    g.gain.setValueAtTime(0.12, now + t);
    g.gain.exponentialRampToValueAtTime(0.001, now + t + 0.05);
    osc.connect(g).connect(mainOut);
    osc.start(now + t);
    osc.stop(now + t + 0.06);
  }
}

$("toggle-sound").addEventListener("click", (e) => {
  state.sound = !state.sound;
  const btn = e.currentTarget;
  btn.setAttribute("aria-pressed", String(state.sound));
  btn.setAttribute("aria-label", state.sound ? "Sound on" : "Sound off");
  btn.title = state.sound ? "Sound on" : "Sound off";
  unlockAudio();
  mainOut?.gain.setTargetAtTime(state.sound ? 1 : 0, audio.currentTime, 0.05);
  emit("sound:toggle", { on: state.sound });
});

/* ---------- Utilities ---------- */

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}

/* ---------- The api for features ---------- */

Object.assign(api, {
  getState: () => state,
  getTheme: () => state.theme,
  startGame,
  showScreen: show,
  elapsed,
  loseHeart,
  jumpscare,
  toast,
  flickerLights,
  unlockAudio,
  getAudio() {
    unlockAudio();
    return audio ? { ctx: audio, out: mainOut, scareBus } : null;
  },
  setTermsText(text, { highlight = null } = {}) {
    state.room.termsText = text;
    state.termsHighlight = highlight;
    renderContract($("contract-search").value);
  },
  addDoorGuard(guard) {
    doorGuards.push(guard);
    return () => doorGuards.splice(doorGuards.indexOf(guard), 1);
  },
  escapeHtml,
});

emit("core:ready");
