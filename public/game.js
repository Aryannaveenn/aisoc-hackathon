// Terms of Dread: the client-side game.

const MAX_HEARTS = 5;
const OBJECTS = ["portrait", "clock", "bookshelf", "desk", "safe"];
const NUMERALS = ["I", "II", "III", "IV", "V"];
const OBJECT_NAMES = {
  portrait: "The portrait",
  clock: "The grandfather clock",
  bookshelf: "The bookshelf",
  desk: "The desk",
  safe: "The safe",
};
const LOADING_LINES = [
  "Reading the fine print by candlelight…",
  "Searching for the clauses nobody reads…",
  "Waking the ghosts of past users…",
  "Hiding the door code around the office…",
  "Sharpening the arbitration clause…",
];

const $ = (id) => document.getElementById(id);

const state = {
  room: null,
  hearts: MAX_HEARTS,
  solved: new Set(),
  hintsShown: {},
  startedAt: 0,
  timer: 0,
  sound: true,
  over: false,
  current: null,
};

/* ---------- Screens ---------- */

function show(screen) {
  for (const id of ["screen-title", "screen-loading", "screen-game"]) {
    $(id).hidden = id !== screen;
  }
}

let loadingTimer = 0;
function startLoading() {
  show("screen-loading");
  let i = 0;
  $("loading-line").textContent = LOADING_LINES[0];
  loadingTimer = setInterval(() => {
    i = (i + 1) % LOADING_LINES.length;
    $("loading-line").textContent = LOADING_LINES[i];
  }, 4000);
}
const stopLoading = () => clearInterval(loadingTimer);

/* ---------- Summoning a room ---------- */

$("summon-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const url = $("terms-url").value.trim();
  const text = $("terms-text").value.trim();
  const error = $("summon-error");
  if (!url && !text) {
    error.textContent = "Add a link to the terms, or paste the text.";
    error.hidden = false;
    return;
  }
  error.hidden = true;
  unlockAudio();
  startLoading();
  try {
    const res = await fetch("/api/room", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(text ? { text } : { url }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "The room couldn't be built.");
    startGame(data);
  } catch (err) {
    show("screen-title");
    error.textContent = err.message;
    error.hidden = false;
  } finally {
    stopLoading();
  }
});

$("play-demo").addEventListener("click", async () => {
  unlockAudio();
  const [room, termsText] = await Promise.all([
    fetch("demo/room.json").then((r) => r.json()),
    fetch("demo/terms.txt").then((r) => r.text()),
  ]);
  startGame({ ...room, termsText });
});

/* ---------- Game lifecycle ---------- */

function startGame(room) {
  state.room = room;
  state.hearts = MAX_HEARTS;
  state.solved = new Set();
  state.hintsShown = {};
  state.over = false;
  state.startedAt = Date.now();
  clearInterval(state.timer);
  state.timer = setInterval(renderTimer, 1000);

  $("hud-company").textContent = room.company;
  $("intro").textContent = room.intro;
  renderTimer();
  renderHearts();
  buildRoom();
  renderContract("");
  preloadScares();
  startAmbience();
  show("screen-game");
}

function renderTimer() {
  const s = Math.floor((Date.now() - state.startedAt) / 1000);
  $("timer").textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

const HEART_PATH = "M12 21s-7.5-4.6-9.6-9.3C.9 8.4 3 4.5 6.6 4.5c2.1 0 3.5 1.2 4.4 2.6.9-1.4 2.3-2.6 4.4-2.6 3.6 0 5.7 3.9 4.2 7.2C19.5 16.4 12 21 12 21z";

function renderHearts(breakingIndex = -1) {
  const wrap = $("hearts");
  wrap.innerHTML = "";
  wrap.setAttribute("aria-label", `${state.hearts} of ${MAX_HEARTS} hearts remaining`);
  for (let i = 0; i < MAX_HEARTS; i++) {
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
  for (const d of ["puzzle", "door", "contract"]) $(d).close();

  const title = $("ending-title");
  title.textContent = won ? "You escaped" : "Bound by the terms";
  title.classList.toggle("won", won);
  const time = $("timer").textContent;
  $("ending-text").textContent = won
    ? `You read the fine print and walked out of ${state.room.company}'s office in ${time} with ${state.hearts} of ${MAX_HEARTS} hearts left. Most people never get this far: they just click "I agree".`
    : `Your last heart gave out. Like everyone else who never read the terms, you belong to ${state.room.company} now. The good news: you can still find out what you agreed to.`;
  $("ending-verdict").innerHTML = state.room.verdict.map((v) => `<li>${escapeHtml(v)}</li>`).join("");
  $("ending").showModal();
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

function hotspot(object, label, box, art) {
  const [x, y, w, h] = box;
  return `
    <g class="hotspot" data-object="${object}" tabindex="0" role="button" aria-label="${label}">
      <rect class="glow" x="${x - 8}" y="${y - 8}" width="${w + 16}" height="${h + 16}" rx="10" fill="rgb(179 242 138 / 0.07)" stroke="#b3f28a" stroke-opacity="0.5" stroke-dasharray="6 6"/>
      ${art}
      <rect class="outline" x="${x - 8}" y="${y - 8}" width="${w + 16}" height="${h + 16}" rx="10" fill="transparent" stroke="none"/>
    </g>`;
}

function buildRoom() {
  const books = [];
  const bookColors = ["#5b1a1f", "#2d3b2a", "#4a3a20", "#2a2840", "#6b4a1e", "#3c1530", "#203238"];
  for (let shelf = 0; shelf < 4; shelf++) {
    let x = 878;
    let i = shelf * 3;
    while (x < 1095) {
      const w = 14 + ((i * 7) % 12);
      const h = 62 + ((i * 13) % 22);
      const tilt = i % 9 === 4 ? `transform="rotate(-12 ${x} ${shelf * 100 + 205})"` : "";
      books.push(`<rect x="${x}" y="${shelf * 100 + 205 - h}" width="${w}" height="${h}" fill="${bookColors[i % bookColors.length]}" stroke="#0b0806" ${tilt}/>`);
      x += w + 2;
      i++;
    }
  }

  const svg = `
    <defs>
      <pattern id="wallpaper" width="60" height="60" patternUnits="userSpaceOnUse">
        <rect width="60" height="60" fill="#18261d"/>
        <path d="M30 6 C38 18 38 26 30 34 C22 26 22 18 30 6Z M0 36 C8 48 8 56 0 64 M60 36 C52 48 52 56 60 64" fill="#1d2e23"/>
      </pattern>
      <radialGradient id="candlelight" cx="0.22" cy="0.72" r="0.55">
        <stop offset="0" stop-color="#f2a63a" stop-opacity="0.32"/>
        <stop offset="1" stop-color="#f2a63a" stop-opacity="0"/>
      </radialGradient>
      <radialGradient id="vignette" cx="0.5" cy="0.5" r="0.75">
        <stop offset="0.55" stop-color="#000" stop-opacity="0"/>
        <stop offset="1" stop-color="#000" stop-opacity="0.75"/>
      </radialGradient>
      <radialGradient id="moonglow" cx="0.5" cy="0.5" r="0.5">
        <stop offset="0" stop-color="#dfe8d2" stop-opacity="0.5"/>
        <stop offset="1" stop-color="#dfe8d2" stop-opacity="0"/>
      </radialGradient>
    </defs>

    <rect width="1200" height="520" fill="url(#wallpaper)"/>
    <rect y="500" width="1200" height="22" fill="#2a1a10"/>
    <rect y="520" width="1200" height="180" fill="#1f150d"/>
    ${[560, 610, 665].map((y) => `<line x1="0" x2="1200" y1="${y}" y2="${y}" stroke="#140d07" stroke-width="2"/>`).join("")}
    ${[150, 420, 700, 980].map((x, i) => `<line x1="${x + (i % 2) * 60}" x2="${x + (i % 2) * 60}" y1="520" y2="700" stroke="#140d07" stroke-width="2"/>`).join("")}

    <!-- Window and moon -->
    <g>
      <rect x="292" y="72" width="146" height="196" fill="#3a2a1a"/>
      <rect x="302" y="82" width="126" height="176" fill="#0a1424"/>
      <circle cx="380" cy="140" r="70" fill="url(#moonglow)"/>
      <circle cx="380" cy="140" r="30" fill="#e6ecd8"/>
      <circle cx="370" cy="132" r="5" fill="#c9d1bd"/><circle cx="390" cy="150" r="7" fill="#c9d1bd"/>
      <path d="M302 236 Q330 214 352 236 Q380 206 428 236 V258 H302Z" fill="#05080c"/>
      <line x1="365" y1="82" x2="365" y2="258" stroke="#3a2a1a" stroke-width="6"/>
      <line x1="302" y1="170" x2="428" y2="170" stroke="#3a2a1a" stroke-width="6"/>
      <path d="M302 82 L340 82 M302 82 L302 120 M302 82 L332 112 M314 82 Q312 96 302 98 M326 82 Q322 106 302 110" stroke="#9aa596" stroke-opacity="0.5" fill="none"/>
    </g>

    ${hotspot("portrait", "The portrait, lock I", [78, 96, 168, 214], `
      <rect x="78" y="96" width="168" height="214" fill="#8a6a2a" stroke="#4f3a12" stroke-width="4"/>
      <rect x="94" y="112" width="136" height="182" fill="#22261f"/>
      <path d="M118 294 C120 240 140 226 162 226 C184 226 204 240 206 294Z" fill="#2c1d22"/>
      <ellipse cx="162" cy="182" rx="36" ry="46" fill="#c7c4b0"/>
      <path d="M126 168 C128 130 196 130 198 168 C190 150 134 150 126 168Z" fill="#1a1612"/>
      <ellipse cx="148" cy="182" rx="9" ry="6" fill="#efe9d6"/>
      <ellipse cx="176" cy="182" rx="9" ry="6" fill="#efe9d6"/>
      <g class="portrait-eyes"><circle cx="148" cy="182" r="3.6" fill="#120c08"/><circle cx="176" cy="182" r="3.6" fill="#120c08"/></g>
      <path d="M150 210 Q162 216 174 210" stroke="#6b4b45" stroke-width="2" fill="none"/>
      ${plate(0, 162, 330)}`)}

    ${hotspot("clock", "The grandfather clock, lock II", [716, 128, 98, 392], `
      <path d="M722 200 Q765 118 808 200 V500 H722Z" fill="#3b2414" stroke="#1d1007" stroke-width="3"/>
      <circle cx="765" cy="196" r="32" fill="#e3d6b2" stroke="#8a6a2a" stroke-width="4"/>
      ${Array.from({ length: 12 }, (_, i) => {
        const a = (i / 12) * Math.PI * 2;
        return `<line x1="${765 + Math.sin(a) * 25}" y1="${196 - Math.cos(a) * 25}" x2="${765 + Math.sin(a) * 29}" y2="${196 - Math.cos(a) * 29}" stroke="#2b1d12" stroke-width="2"/>`;
      }).join("")}
      <line x1="765" y1="196" x2="765" y2="174" stroke="#2b1d12" stroke-width="3"/>
      <line x1="765" y1="196" x2="780" y2="206" stroke="#2b1d12" stroke-width="3"/>
      <rect x="740" y="246" width="50" height="210" fill="#120c07" stroke="#8a6a2a" stroke-width="2"/>
      <g><line x1="765" y1="250" x2="765" y2="400" stroke="#8a6a2a" stroke-width="3"/><circle cx="765" cy="410" r="14" fill="#b08d3e"/>
        <animateTransform attributeName="transform" type="rotate" values="-9 765 250;9 765 250;-9 765 250" dur="2s" repeatCount="indefinite"/></g>
      <rect x="716" y="500" width="98" height="20" fill="#2a180c"/>
      ${plate(1, 765, 476)}`)}

    ${hotspot("bookshelf", "The bookshelf, lock III", [862, 96, 248, 424], `
      <rect x="862" y="96" width="248" height="424" fill="#2a1a0e" stroke="#120a05" stroke-width="4"/>
      ${[205, 305, 405, 505].map((y) => `<rect x="870" y="${y}" width="232" height="10" fill="#3d2614"/>`).join("")}
      ${books.join("")}
      <circle cx="1060" cy="190" r="12" fill="#d8d2bd"/><circle cx="1056" cy="188" r="2.5" fill="#000"/><circle cx="1064" cy="188" r="2.5" fill="#000"/>
      <path d="M1100 104 L1060 104 M1100 104 L1100 140 M1100 104 L1072 132" stroke="#9aa596" stroke-opacity="0.5"/>
      ${plate(2, 986, 70)}`)}

    <!-- The exit door -->
    <g class="hotspot door" data-object="door" tabindex="0" role="button" aria-label="The exit door">
      <rect class="glow" x="470" y="160" width="200" height="370" rx="10" fill="rgb(179 242 138 / 0.07)" stroke="#b3f28a" stroke-opacity="0.5" stroke-dasharray="6 6"/>
      <rect x="478" y="168" width="184" height="352" fill="#2a180c"/>
      <rect x="490" y="180" width="160" height="340" fill="#4a2c16" stroke="#1d1007" stroke-width="3"/>
      <rect x="506" y="198" width="128" height="120" fill="none" stroke="#2a180c" stroke-width="4"/>
      <rect x="506" y="338" width="128" height="160" fill="none" stroke="#2a180c" stroke-width="4"/>
      <circle cx="626" cy="350" r="9" fill="#b08d3e"/>
      <path d="M622 366 h8 l-2 14 h-4z" fill="#0b0604"/>
      <rect class="door-gap" x="490" y="514" width="160" height="6" fill="#b3f28a" opacity="0.15"/>
      <text x="570" y="150" text-anchor="middle" font-family="UnifrakturCook, serif" font-size="26" fill="#f2a63a">Exit</text>
      <rect class="outline" x="470" y="160" width="200" height="370" rx="10" fill="transparent" stroke="none"/>
    </g>

    <rect width="1200" height="700" fill="url(#candlelight)" pointer-events="none"/>

    ${hotspot("desk", "The desk, lock IV", [52, 430, 380, 230], `
      <rect x="52" y="470" width="380" height="26" fill="#4a2c16" stroke="#1d1007" stroke-width="3"/>
      <rect x="66" y="496" width="352" height="96" fill="#3b2414"/>
      <rect x="84" y="512" width="140" height="62" fill="#2e1c0f" stroke="#1d1007"/><circle cx="154" cy="543" r="5" fill="#b08d3e"/>
      <rect x="66" y="592" width="22" height="66" fill="#2e1c0f"/><rect x="396" y="592" width="22" height="66" fill="#2e1c0f"/>
      <path d="M240 466 L330 452 L344 468 L254 482Z" fill="#e6d6ad"/>
      <path d="M262 466 L320 457 M264 472 L318 464" stroke="#7d6a4c"/>
      <path d="M312 470 l14 -6" stroke="#8f1421" stroke-width="3"/>
      <rect x="110" y="430" width="16" height="40" fill="#e3d6b2"/>
      <path d="M118 410 C112 420 112 428 118 432 C124 428 124 420 118 410Z" fill="#f2a63a">
        <animate attributeName="d" dur="1.4s" repeatCount="indefinite" values="M118 410 C112 420 112 428 118 432 C124 428 124 420 118 410Z;M117 407 C111 419 113 428 118 432 C123 428 125 419 117 407Z;M118 410 C112 420 112 428 118 432 C124 428 124 420 118 410Z"/></path>
      <path d="M126 450 q4 8 0 16" stroke="#d4c49a" fill="none"/>
      ${plate(3, 366, 524)}`)}

    ${hotspot("safe", "The safe, lock V", [930, 548, 170, 136], `
      <rect x="930" y="548" width="170" height="136" rx="6" fill="#2f3532" stroke="#141816" stroke-width="4"/>
      <rect x="944" y="562" width="142" height="108" rx="4" fill="#363d39" stroke="#1d221f"/>
      <circle cx="1000" cy="616" r="26" fill="#1d221f" stroke="#8a8f86" stroke-width="3"/>
      ${Array.from({ length: 10 }, (_, i) => {
        const a = (i / 10) * Math.PI * 2;
        return `<line x1="${1000 + Math.sin(a) * 18}" y1="${616 - Math.cos(a) * 18}" x2="${1000 + Math.sin(a) * 23}" y2="${616 - Math.cos(a) * 23}" stroke="#8a8f86" stroke-width="2"/>`;
      }).join("")}
      <rect x="1052" y="596" width="10" height="40" rx="3" fill="#8a8f86"/>
      ${plate(4, 1062, 528)}`)}

    <rect width="1200" height="700" fill="url(#vignette)" pointer-events="none"/>
  `;

  const room = $("room");
  room.innerHTML = svg;
  room.classList.remove("door-ready");

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
}

// The portrait's eyes follow the cursor around the room.
document.addEventListener("pointermove", (e) => {
  const eyes = document.querySelector(".portrait-eyes");
  if (!eyes || $("screen-game").hidden) return;
  const rect = $("room").getBoundingClientRect();
  const ex = rect.left + (162 / 1200) * rect.width;
  const ey = rect.top + (182 / 700) * rect.height;
  const angle = Math.atan2(e.clientY - ey, e.clientX - ex);
  eyes.setAttribute("transform", `translate(${Math.cos(angle) * 4} ${Math.sin(angle) * 3})`);
});

function markSolved(object) {
  const index = OBJECTS.indexOf(object);
  const el = document.querySelector(`.hotspot[data-object="${object}"]`);
  el.classList.add("solved");
  el.querySelector(".digit-text").textContent = state.room.puzzles[index].digit;
  el.setAttribute("aria-label", `${OBJECT_NAMES[object]}, lock ${NUMERALS[index]}, opened. Digit ${state.room.puzzles[index].digit}`);
  if (state.solved.size === OBJECTS.length) $("room").classList.add("door-ready");
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
  const index = OBJECTS.indexOf(object);
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
}

function renderHints(puzzle) {
  const shown = state.hintsShown[state.current] ?? 0;
  $("hint-list").innerHTML = puzzle.hints.slice(0, shown).map((h) => `<li>${escapeHtml(h)}</li>`).join("");
  $("hint-btn").hidden = shown >= puzzle.hints.length;
  $("hint-btn").textContent = shown === 0 ? "Ask the ghost for a hint" : "Ask for another hint";
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
  const puzzle = state.room.puzzles[OBJECTS.indexOf(state.current)];
  state.hintsShown[state.current] = (state.hintsShown[state.current] ?? 0) + 1;
  renderHints(puzzle);
});

$("puzzle-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  if (state.over) return;
  const object = state.current;
  const puzzle = state.room.puzzles[OBJECTS.indexOf(object)];
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

  await loseHeart();
  if (state.over) return;
  feedback.textContent = `Wrong. That's not what the terms say. ${state.hearts} ${state.hearts === 1 ? "heart" : "hearts"} left.`;
  feedback.className = "feedback bad";
});

/* ---------- The door ---------- */

function openDoor() {
  if (state.over) return;
  const found = state.room.puzzles.map((p, i) => (state.solved.has(OBJECTS[i]) ? p.digit : "_")).join(" ");
  const remaining = OBJECTS.length - state.solved.size;
  $("door-text").textContent =
    remaining === 0
      ? `Five digits, five brass plates. Enter them in order from I to V. Digits found: ${found}`
      : `The keyhole wants five digits. ${remaining} ${remaining === 1 ? "lock is" : "locks are"} still closed, so a guess is likely to cost you. Digits found: ${found}`;
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
    playClick();
    endGame(true);
    return;
  }
  await loseHeart();
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
    box.textContent = text;
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

// One per heart, from unsettling to worst. Public-domain and CC0 film stills
// and spirit photographs; see public/assets/CREDITS.md.
const SCARES = [
  { src: "assets/scares/1-spirit.jpg", focus: "50% 40%" },
  { src: "assets/scares/2-nun.jpg", focus: "50% 45%" },
  { src: "assets/scares/3-orlok.jpg", focus: "52% 30%" },
  { src: "assets/scares/4-devil.jpg", focus: "50% 35%" },
  { src: "assets/scares/5-phantom.jpg", focus: "50% 35%" },
];

const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

function preloadScares() {
  for (const s of SCARES) new Image().src = s.src;
}

async function jumpscare(level) {
  const scare = $("scare");
  const { src, focus } = SCARES[level - 1] ?? SCARES.at(-1);
  const final = level >= MAX_HEARTS;
  const hitMs = 900 + level * 180 + (final ? 600 : 0);
  const calm = reducedMotion.matches;

  // The dread: the lights die, the music cuts out, a heartbeat. Then it hits.
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
}
// Escape shouldn't skip a scare.
$("scare").addEventListener("cancel", (e) => e.preventDefault());

async function loseHeart() {
  state.hearts -= 1;
  const level = MAX_HEARTS - state.hearts;
  await jumpscare(level);
  renderHearts(state.hearts);
  if (state.hearts <= 0) endGame(false);
}

/* ---------- Sound ---------- */

let audio = null;
let mainOut = null;   // everything goes through here, so mute is one switch
let scareBus = null;  // the jumpscare amp: boost, limit, clip
let ambience = null;
const samples = {};

const SAMPLE_FILES = {
  scream: "assets/sounds/scream.wav",
  demonic: "assets/sounds/demonic-scream.mp3",
};

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
    Object.entries(SAMPLE_FILES).map(async ([name, url]) => {
      try {
        const data = await fetch(url).then((r) => r.arrayBuffer());
        samples[name] = await audio.decodeAudioData(data);
      } catch {
        // The synthesised layers still play without the sample.
      }
    }),
  );
}

function playSample(name, { rate = 1, gain = 1, at = 0 } = {}) {
  const buffer = samples[name];
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

  // Real screams, pitched lower and stacked higher as the hearts run out.
  if (level <= 2) {
    playSample("scream", { rate: 1 - level * 0.05 });
  } else {
    playSample("demonic", { rate: 1.08 - (level - 3) * 0.12 });
    if (level >= 4) playSample("scream", { rate: 0.7, gain: 0.8, at: 0.05 });
    if (level >= 5) playSample("demonic", { rate: 0.62, gain: 0.7, at: 0.12 });
  }

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
});

/* ---------- Utilities ---------- */

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}
