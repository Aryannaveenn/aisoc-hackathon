// How nasty the terms are: a badge in the HUD, a toast that explains the
// hearts, and a breakdown on the ending screen. Rooms without dread get none of it.

import { api, on } from "../api.js";

const $ = (id) => document.getElementById(id);

const tier = (score) => (score >= 70 ? 3 : score >= 40 ? 2 : 1);
const SEVERITY = ["", "Mild", "Nasty", "Vicious"];

function readDread(room) {
  const d = room?.dread;
  if (!d || typeof d.score !== "number" || !Number.isFinite(d.score)) return null;
  return {
    score: Math.max(0, Math.min(100, Math.round(d.score))),
    label: typeof d.label === "string" ? d.label.trim() : "",
    reasons: Array.isArray(d.reasons) ? d.reasons.filter((r) => r && r.summary) : [],
  };
}

function heartsLine(dread, maxHearts) {
  if (maxHearts <= 3) return `Terms this nasty leave you only ${maxHearts} hearts.`;
  if (maxHearts < 5) return `These terms cost you a heart: you start with ${maxHearts}.`;
  return `Mild enough that you keep all ${maxHearts} hearts.`;
}

function explain(dread, maxHearts) {
  return `Dread ${dread.score}${dread.label ? `, ${dread.label[0].toLowerCase()}${dread.label.slice(1)}` : ""}. ${heartsLine(dread, maxHearts)}`;
}

/* ---------- The HUD badge ---------- */

let badge = null;
let toastTimer = 0;

function removeBadge() {
  badge?.remove();
  badge = null;
}

on("game:start", ({ room, maxHearts }) => {
  removeBadge();
  clearTimeout(toastTimer);
  const dread = readDread(room);
  if (!dread) return;

  badge = document.createElement("button");
  badge.type = "button";
  badge.className = "dread-badge";
  badge.dataset.tier = tier(dread.score);
  badge.setAttribute("aria-label", `Dread ${dread.score} out of 100${dread.label ? `: ${dread.label}` : ""}. Explain`);
  badge.title = dread.label ? `Dread ${dread.score}: ${dread.label}` : `Dread ${dread.score}`;
  badge.innerHTML = `
    <span class="dread-badge-gauge" aria-hidden="true" style="--dread: ${dread.score}"><span>${dread.score}</span></span>
    <span class="dread-badge-text" aria-hidden="true">${api.escapeHtml(dread.label || "Dread")}</span>`;
  badge.addEventListener("click", () => api.toast(explain(dread, maxHearts), { duration: 6000 }));
  $("hud-extras").append(badge);

  // A beat after the room appears, so it doesn't land on top of the intro.
  toastTimer = setTimeout(() => api.toast(explain(dread, maxHearts), { duration: 6500 }), 700);
});

on("screen:show", ({ screen }) => {
  if (screen !== "screen-game") {
    removeBadge();
    clearTimeout(toastTimer);
  }
});

/* ---------- The ending breakdown ---------- */

function severityMarks(severity) {
  const s = Math.max(1, Math.min(3, Math.round(severity) || 1));
  return `<span class="dread-sev" data-sev="${s}" title="${SEVERITY[s]}">
      ${[1, 2, 3].map((i) => `<span class="dread-sev-mark${i <= s ? " on" : ""}" aria-hidden="true"></span>`).join("")}
      <span class="visually-hidden">${SEVERITY[s]}, ${s} of 3</span>
    </span>`;
}

on("game:end", ({ room, maxHearts }) => {
  const dread = readDread(room);
  if (!dread) return;
  const esc = api.escapeHtml;
  const reasons = [...dread.reasons].sort((a, b) => (b.severity ?? 0) - (a.severity ?? 0));

  const section = document.createElement("section");
  section.className = "dread-report";
  section.dataset.tier = tier(dread.score);
  section.setAttribute("aria-labelledby", "dread-report-title");
  section.innerHTML = `
    <h3 id="dread-report-title">How cursed these terms are</h3>
    <div class="dread-score-row">
      <p class="dread-score"><span class="dread-score-num">${dread.score}</span><span class="dread-score-of">out of 100</span></p>
      <div class="dread-score-side">
        ${dread.label ? `<p class="dread-label">${esc(dread.label)}</p>` : ""}
        <p class="dread-hearts">${esc(heartsLine(dread, maxHearts))}</p>
      </div>
    </div>
    <div class="dread-meter" role="meter" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${dread.score}"
         aria-valuetext="${esc(`${dread.score} out of 100${dread.label ? `, ${dread.label}` : ""}`)}" aria-label="Dread score">
      <span class="dread-meter-fill" style="width: ${dread.score}%"></span>
      <span class="dread-meter-tick" style="left: 40%"></span>
      <span class="dread-meter-tick" style="left: 70%"></span>
    </div>
    <div class="dread-scale" aria-hidden="true">
      <span style="left: 0">5 hearts</span><span style="left: 40%">4 hearts</span><span style="left: 70%">3 hearts</span>
    </div>
    ${reasons.length ? `
      <ul class="dread-reasons">
        ${reasons.map((r) => `
          <li class="dread-reason">
            ${severityMarks(r.severity)}
            <p><strong class="dread-cat">${esc(r.category || "Other")}</strong> ${esc(r.summary)}</p>
          </li>`).join("")}
      </ul>` : ""}`;
  $("ending-extras").append(section);
});
