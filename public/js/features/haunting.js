// Random hauntings: while a game runs, every so often something harmless
// happens. Lights flicker, the terms are whispered, a shadow crosses the wall,
// something knocks. None of it costs a heart. It comes sooner as hearts drop.
//
// Test hook: ?haunt=fast shortens the wait to a few seconds; add event names to
// pick from only those, e.g. ?haunt=fast,shadow,glimpse.

import { api, on } from "../api.js";

const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
const $ = (id) => document.getElementById(id);
const rand = (a, b) => a + Math.random() * (b - a);
const pick = (list) => list[Math.floor(Math.random() * list.length)];

const hook = (new URLSearchParams(location.search).get("haunt") ?? "").split(",").filter(Boolean);
const FAST = hook.includes("fast");

const SCARE_STILLS = ["1-spirit", "2-nun", "3-orlok", "4-devil", "5-phantom"].map((n) => `assets/scares/${n}.jpg`);
const SHADOW_SRC = "assets/haunting/orlok-shadow.svg";

let whispering = false;

const run = {
  active: false,
  timer: 0,
  due: 0,
  last: "",
  lastScareEnd: 0,
  timeouts: new Set(),
  nodes: new Set(),
};

/* ---------- Scheduling ---------- */

// 25–60 s at full health, down to about half that on the last heart.
function nextDelay() {
  const { hearts, maxHearts } = api.getState();
  const health = maxHearts ? Math.max(0, hearts) / maxHearts : 1;
  const base = FAST ? rand(4000, 7000) : rand(25000, 60000);
  return base * (0.45 + 0.55 * health);
}

function schedule(ms = nextDelay()) {
  clearTimeout(run.timer);
  run.due = Date.now() + ms;
  run.timer = setTimeout(tick, ms);
}

function later(fn, ms) {
  const id = setTimeout(() => {
    run.timeouts.delete(id);
    fn();
  }, ms);
  run.timeouts.add(id);
}

function busy() {
  const state = api.getState();
  return (
    state.over ||
    state.scaring ||
    document.hidden ||
    $("screen-game").hidden ||
    Date.now() - run.lastScareEnd < 4000 ||
    document.body.classList.contains("twist-arriving") ||
    document.body.classList.contains("flicker") ||
    document.body.classList.contains("lights-out")
  );
}

function tick() {
  if (!run.active) return;
  if (busy()) {
    schedule(rand(2500, 5000));
    return;
  }
  const dialogOpen = Boolean(document.querySelector("dialog[open]"));
  const only = hook.filter((name) => name in EVENTS);
  let pool = Object.entries(EVENTS).filter(
    ([name, ev]) => (!only.length || only.includes(name)) && !(dialogOpen && ev.visual) && !(reducedMotion.matches && ev.flashes),
  );
  if (pool.length > 1) pool = pool.filter(([name]) => name !== run.last);
  if (pool.length) {
    const [name, ev] = pick(pool);
    run.last = name;
    document.body.dataset.haunting = name;
    later(() => delete document.body.dataset.haunting, 3000);
    ev.play();
  }
  schedule();
}

function start() {
  stop();
  run.active = true;
  run.last = "";
  schedule(FAST ? rand(3000, 5000) : rand(20000, 35000));
}

function stop() {
  run.active = false;
  clearTimeout(run.timer);
  for (const id of run.timeouts) clearTimeout(id);
  run.timeouts.clear();
  for (const node of run.nodes) node.remove();
  run.nodes.clear();
  delete document.body.dataset.haunting;
  if ("speechSynthesis" in window && whispering) speechSynthesis.cancel();
  whispering = false;
}

on("game:start", start);
on("game:end", stop);
on("screen:show", ({ screen }) => {
  if (screen !== "screen-game") stop();
});
on("scare:end", () => (run.lastScareEnd = Date.now()));
// Speech can't go through the muted audio graph, so cut it off directly.
on("sound:toggle", ({ on: soundOn }) => {
  if (!soundOn && "speechSynthesis" in window && whispering) speechSynthesis.cancel();
});
// Losing a heart brings the next haunting closer, never further away.
on("heart:lost", () => {
  if (!run.active) return;
  const ms = nextDelay();
  if (ms < run.due - Date.now()) schedule(ms + 4000);
});

/* ---------- Elements ---------- */

function layer(className, { fixed = false } = {}) {
  const el = document.createElement("div");
  el.className = `haunt-layer ${className}`;
  el.setAttribute("aria-hidden", "true");
  (fixed ? document.body : $("room-overlay")).append(el);
  run.nodes.add(el);
  return el;
}

function removeLater(el, ms) {
  later(() => {
    el.remove();
    run.nodes.delete(el);
  }, ms);
}

/* ---------- Sound ---------- */

function audio() {
  const a = api.getAudio();
  return a ? { ctx: a.ctx, out: a.out } : null;
}

function noise(ctx, seconds) {
  const buffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * seconds), ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  return buffer;
}

// A shared room reverb so knocks and creaks sound like they're somewhere else in the house.
const reverbs = new WeakMap();
function reverb(ctx, out) {
  if (reverbs.has(ctx)) return reverbs.get(ctx);
  const seconds = 2.4;
  const impulse = ctx.createBuffer(2, Math.ceil(ctx.sampleRate * seconds), ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const data = impulse.getChannelData(ch);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / data.length, 3);
  }
  const conv = ctx.createConvolver();
  conv.buffer = impulse;
  const wet = ctx.createGain();
  wet.gain.value = 0.7;
  conv.connect(wet).connect(out);
  reverbs.set(ctx, conv);
  return conv;
}

// A "distant" chain: muffled, panned off to one side, mostly reverb.
function distant(ctx, out, pan = rand(-0.8, 0.8)) {
  const input = ctx.createGain();
  const muffle = ctx.createBiquadFilter();
  muffle.type = "lowpass";
  muffle.frequency.value = 1100;
  const panner = ctx.createStereoPanner();
  panner.pan.value = pan;
  const dry = ctx.createGain();
  dry.gain.value = 0.5;
  input.connect(muffle).connect(panner);
  panner.connect(dry).connect(out);
  panner.connect(reverb(ctx, out));
  return input;
}

function playBuzz(ms) {
  const a = audio();
  if (!a) return;
  const { ctx, out } = a;
  const now = ctx.currentTime;
  const end = now + ms / 1000;
  const osc = ctx.createOscillator();
  osc.type = "sawtooth";
  osc.frequency.value = 100;
  const band = ctx.createBiquadFilter();
  band.type = "bandpass";
  band.frequency.value = 900;
  band.Q.value = 0.8;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, now);
  // Chop the hum on and off like a failing filament.
  let t = now;
  while (t < end) {
    g.gain.setValueAtTime(Math.random() < 0.6 ? 0.07 : 0.0001, t);
    t += rand(0.03, 0.12);
  }
  g.gain.setValueAtTime(0.0001, end);
  osc.connect(band).connect(g).connect(out);
  osc.start(now);
  osc.stop(end + 0.05);

  // A couple of sparks.
  for (let i = 0; i < 3; i++) {
    const at = now + rand(0, ms / 1000);
    const src = ctx.createBufferSource();
    src.buffer = noise(ctx, 0.04);
    const hp = ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 3000;
    const sg = ctx.createGain();
    sg.gain.setValueAtTime(0.12, at);
    sg.gain.exponentialRampToValueAtTime(0.0001, at + 0.04);
    src.connect(hp).connect(sg).connect(out);
    src.start(at);
  }
}

function playKnocks() {
  const a = audio();
  if (!a) return;
  const { ctx, out } = a;
  const input = distant(ctx, out);
  const pattern = pick([[0, 0.3, 0.6], [0, 0.26, 0.52, 1.5], [0, 0.9, 1.15]]);
  const base = ctx.currentTime + 0.05;
  for (const offset of pattern) {
    const t = base + offset;
    const osc = ctx.createOscillator();
    osc.frequency.setValueAtTime(140, t);
    osc.frequency.exponentialRampToValueAtTime(70, t + 0.08);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.9, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.14);
    osc.connect(g).connect(input);
    osc.start(t);
    osc.stop(t + 0.16);

    const src = ctx.createBufferSource();
    src.buffer = noise(ctx, 0.06);
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 700;
    const ng = ctx.createGain();
    ng.gain.setValueAtTime(0.7, t);
    ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);
    src.connect(lp).connect(ng).connect(input);
    src.start(t);
  }
}

// A door creak: a train of tiny clicks, speeding up and slowing down, rung
// through a couple of wooden resonances.
function playCreak() {
  const a = audio();
  if (!a) return;
  const { ctx, out } = a;
  const seconds = rand(1.4, 2.2);
  const buffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * seconds), ctx.sampleRate);
  const data = buffer.getChannelData(0);
  const sr = ctx.sampleRate;
  let t = 0;
  while (t < seconds) {
    const p = t / seconds;
    const rate = 18 + 70 * Math.sin(Math.PI * p) * (0.7 + 0.3 * Math.sin(p * 23));
    const start = Math.floor(t * sr);
    for (let i = 0; i < 160 && start + i < data.length; i++) {
      data[start + i] += Math.sin(i * 0.9) * Math.exp(-i / 30) * (0.6 + Math.random() * 0.4);
    }
    t += 1 / rate;
  }
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  const input = distant(ctx, out);
  const env = ctx.createGain();
  const now = ctx.currentTime;
  env.gain.setValueAtTime(0.0001, now);
  env.gain.exponentialRampToValueAtTime(0.9, now + 0.2);
  env.gain.setValueAtTime(0.9, now + seconds - 0.3);
  env.gain.exponentialRampToValueAtTime(0.0001, now + seconds);
  for (const [f, q] of [[620, 9], [1240, 7], [1900, 5]]) {
    const band = ctx.createBiquadFilter();
    band.type = "bandpass";
    band.frequency.value = f * rand(0.9, 1.1);
    band.Q.value = q;
    src.connect(band).connect(env);
  }
  env.connect(input);
  src.start(now);
}

function playWhoosh(seconds) {
  const a = audio();
  if (!a) return;
  const { ctx, out } = a;
  const now = ctx.currentTime;
  const src = ctx.createBufferSource();
  src.buffer = noise(ctx, seconds);
  const lp = ctx.createBiquadFilter();
  lp.type = "lowpass";
  lp.Q.value = 3;
  lp.frequency.setValueAtTime(180, now);
  lp.frequency.exponentialRampToValueAtTime(900, now + seconds * 0.5);
  lp.frequency.exponentialRampToValueAtTime(160, now + seconds);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, now);
  g.gain.exponentialRampToValueAtTime(0.35, now + seconds * 0.5);
  g.gain.exponentialRampToValueAtTime(0.0001, now + seconds);
  src.connect(lp).connect(g).connect(out);
  src.start(now);

  // A low, sour drone under the breath.
  for (const f of [61.7, 65.4]) {
    const osc = ctx.createOscillator();
    osc.frequency.value = f;
    const og = ctx.createGain();
    og.gain.setValueAtTime(0.0001, now);
    og.gain.exponentialRampToValueAtTime(0.12, now + seconds * 0.4);
    og.gain.exponentialRampToValueAtTime(0.0001, now + seconds);
    osc.connect(og).connect(out);
    osc.start(now);
    osc.stop(now + seconds + 0.05);
  }
}

function playGust(seconds) {
  const a = audio();
  if (!a) return;
  const { ctx, out } = a;
  const now = ctx.currentTime;
  const src = ctx.createBufferSource();
  src.buffer = noise(ctx, seconds);
  const band = ctx.createBiquadFilter();
  band.type = "bandpass";
  band.Q.value = 2;
  band.frequency.setValueAtTime(300, now);
  band.frequency.linearRampToValueAtTime(850, now + seconds * 0.45);
  band.frequency.linearRampToValueAtTime(380, now + seconds);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, now);
  g.gain.exponentialRampToValueAtTime(0.28, now + seconds * 0.45);
  g.gain.exponentialRampToValueAtTime(0.0001, now + seconds);
  src.connect(band).connect(g).connect(out);
  src.start(now);
}

function playPress(at = 0) {
  const a = audio();
  if (!a) return;
  const { ctx, out } = a;
  const t = ctx.currentTime + at;
  const src = ctx.createBufferSource();
  src.buffer = noise(ctx, 0.18);
  const lp = ctx.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.setValueAtTime(1400, t);
  lp.frequency.exponentialRampToValueAtTime(300, t + 0.18);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.35, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
  src.connect(lp).connect(g).connect(out);
  src.start(t);
}

// A breathy whisper with no words: noise through shifting vowel formants.
function playWhisperNoise(seconds) {
  const a = audio();
  if (!a) return;
  const { ctx, out } = a;
  const now = ctx.currentTime;
  const src = ctx.createBufferSource();
  src.buffer = noise(ctx, seconds);
  const hp = ctx.createBiquadFilter();
  hp.type = "highpass";
  hp.frequency.value = 500;
  const env = ctx.createGain();
  env.gain.setValueAtTime(0.0001, now);
  const formants = [ctx.createBiquadFilter(), ctx.createBiquadFilter()];
  const vowels = [[700, 1200], [400, 2200], [500, 900], [300, 2400], [650, 1700]];
  let t = now;
  while (t < now + seconds - 0.15) {
    const syll = rand(0.12, 0.24);
    const [f1, f2] = pick(vowels);
    formants[0].frequency.setTargetAtTime(f1, t, 0.03);
    formants[1].frequency.setTargetAtTime(f2, t, 0.03);
    env.gain.setTargetAtTime(rand(0.25, 0.5), t, 0.03);
    env.gain.setTargetAtTime(0.02, t + syll * 0.7, 0.04);
    t += syll;
  }
  env.gain.setTargetAtTime(0.0001, t, 0.05);
  const pan = ctx.createStereoPanner();
  pan.pan.value = rand(-0.9, 0.9);
  for (const f of formants) {
    f.type = "bandpass";
    f.Q.value = 6;
    src.connect(hp).connect(f).connect(env);
  }
  env.connect(pan).connect(out);
  src.start(now);
}

/* ---------- The terms, whispered ---------- */

const TRAILING = /^(a|an|the|at|least|to|of|and|or|by|be|in|on|for|with|your|our|any|all|we|you|may|will|is|are|that|this|from|as|if|not)$/i;

function phrase() {
  const text = api.getState().room?.termsText ?? "";
  const sentences = text
    .split(/\n+|(?<=[.;!?])\s+/)
    .map((s) => s.replace(/^\s*(\d+(\.\d+)*|[a-z]\)|\([a-z0-9]+\))\s+/i, "").trim())
    .filter((s) => s.length > 30 && s.length < 400 && /[a-z]/.test(s) && s.split(/\s+/).length >= 6);
  if (!sentences.length) return "you agreed, you agreed, you agreed";
  const words = pick(sentences).split(/\s+/);
  let count = Math.min(words.length, 5 + Math.floor(Math.random() * 4));
  // Don't trail off on "the", "at least", "to": end on a word that means something.
  while (count < words.length && count < 12 && TRAILING.test(words[count - 1])) count++;
  return words.slice(0, count).join(" ").replace(/[,;:.()"]+$/, "");
}

function speak(words) {
  if (!("speechSynthesis" in window) || !api.getState().sound) return false;
  const voices = speechSynthesis.getVoices().filter((v) => /^en/i.test(v.lang));
  if (!voices.length && speechSynthesis.getVoices().length) return false;
  const u = new SpeechSynthesisUtterance(words);
  u.voice = voices.find((v) => /whisper/i.test(v.name)) ?? voices.find((v) => v.localService) ?? voices[0] ?? null;
  u.pitch = 0.1;
  u.rate = 0.62;
  u.volume = 0.3;
  // Some browsers accept the request and never speak; fall back to a breath.
  let started = false;
  u.onstart = () => (started = true);
  u.onend = u.onerror = () => (whispering = false);
  whispering = true;
  speechSynthesis.cancel();
  speechSynthesis.speak(u);
  later(() => {
    if (started || !run.active) return;
    speechSynthesis.cancel();
    whispering = false;
    playWhisperNoise(Math.min(4, 0.9 + words.split(" ").length * 0.32));
  }, 1200);
  return true;
}

/* ---------- The events ---------- */

const EVENTS = {
  flicker: {
    visual: true,
    play() {
      const ms = Math.round(rand(700, 1300));
      playBuzz(ms);
      if (reducedMotion.matches) {
        // No strobing: the room just dims and comes back.
        const el = layer("haunt-dim");
        removeLater(el, 2600);
      } else {
        api.flickerLights(ms);
      }
    },
  },

  whisper: {
    visual: false,
    play() {
      const words = phrase();
      if (!speak(words)) playWhisperNoise(Math.min(4, 0.9 + words.split(" ").length * 0.32));
      // The words surface on the wall too, for anyone who can't hear them.
      const el = layer("haunt-whisper");
      el.textContent = `…${words.toLowerCase()}…`;
      el.style.left = `${rand(8, 52)}%`;
      el.style.top = `${rand(10, 70)}%`;
      el.style.rotate = `${rand(-6, 6)}deg`;
      removeLater(el, 5200);
    },
  },

  shadow: {
    visual: true,
    play() {
      const ms = reducedMotion.matches ? 4200 : Math.round(rand(6000, 8000));
      const el = layer("haunt-shadow");
      el.innerHTML = `<img src="${SHADOW_SRC}" alt="" />`;
      el.classList.add(Math.random() < 0.5 ? "ltr" : "rtl");
      if (reducedMotion.matches) el.style.left = `${pick([2, 58])}%`;
      el.style.setProperty("--haunt-ms", `${ms}ms`);
      playWhoosh(ms / 1000);
      removeLater(el, ms + 100);
    },
  },

  knock: {
    visual: false,
    play: playKnocks,
  },

  creak: {
    visual: false,
    play: playCreak,
  },

  fog: {
    visual: true,
    play() {
      const ms = 10000;
      const el = layer("haunt-fog", { fixed: true });
      el.style.setProperty("--haunt-ms", `${ms}ms`);
      playGust(4.5);
      removeLater(el, ms + 100);
    },
  },

  handprints: {
    visual: true,
    play() {
      const count = 3 + Math.floor(Math.random() * 3);
      const side = pick(["left", "right", "bottom"]);
      const prints = [];
      for (let i = 0; i < count; i++) {
        const el = layer(`haunt-hand ${Math.random() < 0.5 ? "flip" : ""}`);
        el.innerHTML = HAND_SVG;
        const along = 8 + (i / Math.max(1, count - 1)) * 70 + rand(-4, 4);
        if (side === "bottom") {
          el.style.left = `${along}%`;
          el.style.top = `${rand(72, 80)}%`;
          el.style.rotate = `${rand(-25, 25)}deg`;
        } else {
          el.style.top = `${Math.min(76, along)}%`;
          el.style[side] = `${rand(0.5, 4)}%`;
          el.style.rotate = `${(side === "left" ? 70 : -70) + rand(-25, 25)}deg`;
        }
        el.style.animationDelay = `${i * 450}ms, ${5200}ms`;
        playPress(i * 0.45);
        prints.push(el);
      }
      for (const el of prints) removeLater(el, 7000);
    },
  },

  glimpse: {
    visual: true,
    flashes: true,
    play() {
      const el = layer("haunt-glimpse");
      el.innerHTML = `<img src="${pick(SCARE_STILLS)}" alt="" />`;
      el.style.left = `${rand(5, 70)}%`;
      el.style.top = `${rand(5, 45)}%`;
      removeLater(el, 120);
    },
  },
};

const HAND_SVG = `
  <svg viewBox="-8 0 108 128" focusable="false">
    <g fill="#dfe9d6">
      <path d="M24 58 Q20 100 38 114 Q56 124 74 112 Q90 98 86 60 Q70 50 50 52 Q34 52 24 58Z"/>
      <rect x="19" y="58" width="15" height="46" rx="7.5" transform="rotate(-32 26.5 102)"/>
      <rect x="25" y="14" width="13" height="50" rx="6.5" transform="rotate(-8 32 60)"/>
      <rect x="42" y="5" width="14" height="56" rx="7"/>
      <rect x="59" y="11" width="13" height="51" rx="6.5" transform="rotate(6 65 60)"/>
      <rect x="74" y="30" width="11" height="40" rx="5.5" transform="rotate(16 80 68)"/>
    </g>
    <g fill="none" stroke="#0e1712" stroke-opacity="0.35" stroke-width="1.5" stroke-linecap="round">
      <path d="M34 76 Q52 70 76 74"/><path d="M38 90 Q54 84 70 92"/><path d="M50 60 Q46 84 54 108"/>
    </g>
  </svg>`;

// Warm the cache so the shadow and the glimpses appear on their first frame.
on("game:start", () => {
  for (const src of [SHADOW_SRC, ...SCARE_STILLS]) new Image().src = src;
});
