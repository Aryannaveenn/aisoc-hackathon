// Pre-built rooms and the "most cursed terms" leaderboard, on the title card.

import { api, on } from "../api.js";
import { loadRoom } from "./summon.js";

const $ = (id) => document.getElementById(id);

const LEADERBOARD_SIZE = 10;
const LEADERBOARD_SHOWN = 5; // the rest sit behind a "show more" button

// 1 = tame (5 hearts), 2 = from 40 (4 hearts), 3 = from 70 (3 hearts), as the core counts them.
export const dreadTier = (score) => (score >= 70 ? 3 : score >= 40 ? 2 : 1);

let section = null;
let fetchSeq = 0;
let expanded = false;

function ensureSection() {
  if (section?.isConnected) return section;
  section = document.createElement("section");
  section.className = "presets";
  section.setAttribute("aria-labelledby", "presets-heading");
  section.hidden = true;
  $("title-extras").append(section);

  section.addEventListener("click", (e) => {
    const play = e.target.closest("[data-room]");
    if (play) {
      api.unlockAudio();
      loadRoom(play.dataset.room);
      return;
    }
    if (e.target.closest(".cursed-more")) {
      expanded = !expanded;
      section.querySelector(".cursed").classList.toggle("expanded", expanded);
      const btn = section.querySelector(".cursed-more");
      btn.setAttribute("aria-expanded", String(expanded));
      btn.textContent = expanded ? "Show fewer" : btn.dataset.more;
    }
  });
  return section;
}

const esc = (s) => api.escapeHtml(s ?? "");
const hasScore = (r) => typeof r.dread?.score === "number";
const clampScore = (n) => Math.max(0, Math.min(100, Math.round(n)));

function presetButton(room) {
  const score = hasScore(room) ? clampScore(room.dread.score) : null;
  const label = room.dread?.label;
  const name = `Play ${room.company}${score === null ? "" : `, dread ${score}${label ? `, ${label}` : ""}`}`;
  return `
    <li>
      <button type="button" class="preset" data-room="${esc(room.id)}" data-tier="${score === null ? 0 : dreadTier(score)}" aria-label="${esc(name)}">
        <span class="preset-company">${esc(room.company)}</span>
        ${label || score !== null
          ? `<span class="preset-dread">${score === null ? "" : `<span class="preset-score">${score}</span>`}${esc(label ?? "")}</span>`
          : ""}
      </button>
    </li>`;
}

function cursedRow(room, i) {
  const score = clampScore(room.dread.score);
  const label = room.dread.label;
  return `
    <li class="cursed-row" data-tier="${dreadTier(score)}">
      <span class="cursed-rank" aria-hidden="true">${i + 1}</span>
      <button type="button" class="cursed-name" data-room="${esc(room.id)}" aria-label="${esc(`Play ${room.company}, number ${i + 1}, dread ${score}${label ? `, ${label}` : ""}`)}">
        <span class="cursed-company">${esc(room.company)}</span>
        ${label ? `<span class="cursed-label">${esc(label)}</span>` : ""}
      </button>
      <span class="cursed-meter" aria-hidden="true"><span style="width: ${score}%"></span></span>
      <span class="cursed-score" aria-hidden="true">${score}</span>
    </li>`;
}

function render(rooms) {
  const el = ensureSection();
  const presets = rooms.filter((r) => r.preset && r.id && r.company);
  const ranked = rooms
    .filter((r) => hasScore(r) && r.id && r.company)
    .sort((a, b) => b.dread.score - a.dread.score)
    .slice(0, LEADERBOARD_SIZE);

  if (!presets.length && !ranked.length) {
    el.hidden = true;
    el.innerHTML = "";
    return;
  }

  const more = ranked.length - LEADERBOARD_SHOWN;
  const moreText = `Show ${more} more`;
  el.innerHTML = `
    <h2 id="presets-heading" class="visually-hidden">Ready-made rooms</h2>
    ${presets.length ? `
      <div class="presets-block">
        <h3 class="presets-title">Famous terms</h3>
        <p class="presets-hint">No link to hand? Step into a contract someone else signed.</p>
        <ul class="preset-grid">${presets.map(presetButton).join("")}</ul>
      </div>` : ""}
    ${ranked.length ? `
      <div class="presets-block">
        <h3 class="presets-title">Most cursed terms</h3>
        <p class="presets-hint">The nastiest contracts summoned so far, scored out of 100.</p>
        <ol class="cursed${expanded ? " expanded" : ""}">${ranked.map(cursedRow).join("")}</ol>
        ${more > 0 ? `<button type="button" class="cursed-more btn-link" aria-expanded="${expanded}" data-more="${moreText}">${expanded ? "Show fewer" : moreText}</button>` : ""}
      </div>` : ""}`;
  el.hidden = false;
}

async function refresh() {
  const seq = ++fetchSeq;
  try {
    const res = await fetch("/api/rooms");
    if (!res.ok) throw new Error();
    const data = await res.json();
    if (seq !== fetchSeq) return;
    render(Array.isArray(data.rooms) ? data.rooms : []);
  } catch {
    if (seq !== fetchSeq) return;
    // Keep whatever we last showed; with nothing to show, the section stays hidden.
    if (!section?.querySelector(".presets-block")) ensureSection().hidden = true;
  }
}

on("core:ready", refresh);
on("screen:show", ({ screen }) => {
  if (screen === "screen-title") refresh();
});
