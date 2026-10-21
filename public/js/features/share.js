// Share card: on game:end, draws a 1200×630 card of the result and offers
// download, a challenge link and the system share sheet.

import { api, on } from "../api.js";

const W = 1200;
const H = 630;

const C = {
  grave: "#0e1712",
  vault: "#1f2f25",
  parchment: "#e6d6ad",
  ink: "#2b1d12",
  inkSoft: "#6b5537",
  rule: "#b9a374",
  candle: "#f2a63a",
  blood: "#8f1421",
  moss: "#2f5d1e",
  lost: "#b8a77f",
};
const GOTHIC = '"UnifrakturCook", "Old English Text MT", serif';
const BODY = '"IM Fell English", "Iowan Old Style", Georgia, serif';
const HEART = new Path2D("M12 21s-7.5-4.6-9.6-9.3C.9 8.4 3 4.5 6.6 4.5c2.1 0 3.5 1.2 4.4 2.6.9-1.4 2.3-2.6 4.4-2.6 3.6 0 5.7 3.9 4.2 7.2C19.5 16.4 12 21 12 21z");

let drawToken = 0;

/* ---------- Drawing helpers ---------- */

function waitForFonts() {
  if (!document.fonts?.load) return Promise.resolve();
  const loads = Promise.all([
    document.fonts.load(`700 80px ${GOTHIC}`),
    document.fonts.load(`28px ${BODY}`),
    document.fonts.load(`italic 28px ${BODY}`),
  ]).catch(() => {});
  // Draw with fallbacks rather than never, if the font CDN is unreachable.
  return Promise.race([loads, new Promise((r) => setTimeout(r, 2500))]);
}

// Splits text into lines that fit maxWidth. Returns at most maxLines, the last
// one ending in an ellipsis if the text didn't fit.
function wrap(ctx, text, maxWidth, maxLines = Infinity) {
  const words = String(text).split(/\s+/).filter(Boolean);
  const lines = [];
  let line = "";
  for (let i = 0; i < words.length; i++) {
    const next = line ? `${line} ${words[i]}` : words[i];
    if (ctx.measureText(next).width <= maxWidth || !line) {
      line = next;
      continue;
    }
    lines.push(line);
    line = words[i];
    if (lines.length === maxLines) {
      let last = lines[maxLines - 1];
      while (last && ctx.measureText(`${last}…`).width > maxWidth) last = last.replace(/\s*\S+$/, "");
      lines[maxLines - 1] = `${last.replace(/[,;:.]$/, "")}…`;
      return lines;
    }
  }
  if (line) lines.push(line);
  return lines;
}

// The largest font size (down to min) at which text fits in maxLines.
function fitFont(ctx, text, fontFor, maxWidth, maxLines, size, min) {
  for (; size > min; size -= 2) {
    ctx.font = fontFor(size);
    const words = String(text).split(/\s+/);
    const tooWide = words.some((w) => ctx.measureText(w).width > maxWidth);
    if (!tooWide && wrap(ctx, text, maxWidth).length <= maxLines) return size;
  }
  ctx.font = fontFor(min);
  return min;
}

function drawHeart(ctx, x, y, size, filled) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size / 24, size / 24);
  if (filled) {
    ctx.shadowColor = "rgb(143 20 33 / 0.45)";
    ctx.shadowBlur = 10;
    ctx.fillStyle = C.blood;
    ctx.fill(HEART);
  } else {
    ctx.fillStyle = C.lost;
    ctx.fill(HEART);
    ctx.strokeStyle = C.parchment;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(12, 7); ctx.lineTo(10.5, 11); ctx.lineTo(13, 13); ctx.lineTo(11, 17);
    ctx.stroke();
  }
  ctx.restore();
}

function drawBackground(ctx) {
  ctx.fillStyle = C.grave;
  ctx.fillRect(0, 0, W, H);
  const glow = ctx.createRadialGradient(W / 2, -80, 40, W / 2, -80, 760);
  glow.addColorStop(0, C.vault);
  glow.addColorStop(1, "rgb(14 23 18 / 0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  // The parchment, with a warm candle bloom behind it.
  const x = 34, y = 34, w = W - 68, h = H - 68;
  ctx.save();
  ctx.shadowColor = "rgb(242 166 58 / 0.18)";
  ctx.shadowBlur = 60;
  ctx.fillStyle = C.parchment;
  ctx.fillRect(x, y, w, h);
  ctx.restore();

  const light = ctx.createRadialGradient(x + w * 0.2, y + h * 0.1, 0, x + w * 0.2, y + h * 0.1, w * 0.55);
  light.addColorStop(0, "rgb(255 255 255 / 0.28)");
  light.addColorStop(1, "rgb(255 255 255 / 0)");
  ctx.fillStyle = light;
  ctx.fillRect(x, y, w, h);
  const stain = ctx.createRadialGradient(x + w * 0.92, y + h * 0.95, 0, x + w * 0.92, y + h * 0.95, w * 0.5);
  stain.addColorStop(0, "rgb(110 70 20 / 0.32)");
  stain.addColorStop(1, "rgb(110 70 20 / 0)");
  ctx.fillStyle = stain;
  ctx.fillRect(x, y, w, h);
  const edge = ctx.createRadialGradient(W / 2, H / 2, h * 0.45, W / 2, H / 2, w * 0.68);
  edge.addColorStop(0, "rgb(90 60 20 / 0)");
  edge.addColorStop(1, "rgb(90 60 20 / 0.22)");
  ctx.fillStyle = edge;
  ctx.fillRect(x, y, w, h);

  ctx.strokeStyle = C.rule;
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 14.5, y + 14.5, w - 29, h - 29);
}

function drawSeal(ctx, cx, cy, r) {
  ctx.save();
  ctx.shadowColor = "rgb(0 0 0 / 0.35)";
  ctx.shadowBlur = 8;
  ctx.shadowOffsetY = 3;
  ctx.fillStyle = C.blood;
  ctx.beginPath();
  for (let i = 0; i <= 28; i++) {
    const a = (i / 28) * Math.PI * 2;
    const rr = r * (1 + (i % 2 ? 0.06 : -0.03) + Math.sin(i * 2.3) * 0.03);
    ctx.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  ctx.strokeStyle = "rgb(0 0 0 / 0.25)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.72, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = "#e9b9a0";
  ctx.font = `700 ${Math.round(r * 0.95)}px ${GOTHIC}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("D", cx, cy + r * 0.04);
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
}

function drawCard(canvas, d) {
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, W, H);
  drawBackground(ctx);

  const left = 96;
  const colW = 700;
  const statX = 862;

  // Masthead.
  ctx.fillStyle = C.blood;
  ctx.font = `700 36px ${GOTHIC}`;
  ctx.fillText("Terms of Dread", left, 108);

  // Headline.
  const headline = d.won ? `I escaped ${d.company}'s terms` : `I was bound by ${d.company}'s terms`;
  const size = fitFont(ctx, headline, (s) => `700 ${s}px ${GOTHIC}`, colW, 2, 62, 38);
  ctx.fillStyle = d.won ? C.moss : C.ink;
  const headLines = wrap(ctx, headline, colW, 2);
  let y = 116 + size * 0.95;
  for (const line of headLines) {
    ctx.fillText(line, left, y);
    y += size * 1.02;
  }

  // Verdict lines, as many as fit above the footer.
  y -= size * 0.45;
  ctx.strokeStyle = C.rule;
  ctx.beginPath();
  ctx.moveTo(left, y);
  ctx.lineTo(left + colW, y);
  ctx.stroke();
  y += 28;
  ctx.font = `italic 21px ${BODY}`;
  ctx.fillStyle = C.inkSoft;
  ctx.fillText("What I agreed to without reading", left, y);
  y += 4;

  const footerTop = 518;
  ctx.font = `23px ${BODY}`;
  const lineH = 29;
  for (const item of d.verdict.slice(0, 3)) {
    const lines = wrap(ctx, item, colW - 30, 2);
    if (y + lines.length * lineH > footerTop - 12) break;
    ctx.fillStyle = C.blood;
    ctx.beginPath();
    ctx.arc(left + 8, y + lineH - 8, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = C.ink;
    for (const line of lines) {
      y += lineH;
      ctx.fillText(line, left + 30, y);
    }
    y += 7;
  }

  // Stats column.
  ctx.strokeStyle = C.rule;
  ctx.beginPath();
  ctx.moveTo(statX - 38, 92);
  ctx.lineTo(statX - 38, footerTop - 14);
  ctx.stroke();

  const label = (text, ly) => {
    ctx.font = `italic 22px ${BODY}`;
    ctx.fillStyle = C.inkSoft;
    ctx.fillText(text, statX, ly);
  };

  let sy = 116;
  label("Hearts left", sy);
  const hs = d.maxHearts > 4 ? 34 : 40;
  for (let i = 0; i < d.maxHearts; i++) drawHeart(ctx, statX + i * (hs + 6), sy + 12, hs, i < d.hearts);
  ctx.font = `24px ${BODY}`;
  ctx.fillStyle = C.ink;
  ctx.fillText(`${d.hearts} of ${d.maxHearts}`, statX, sy + 12 + hs + 26);

  sy += 120;
  label(d.won ? "Escaped in" : "Lasted", sy);
  ctx.font = `700 50px ${GOTHIC}`;
  ctx.fillStyle = C.ink;
  ctx.fillText(d.time, statX, sy + 52);

  if (d.dread) {
    sy += 102;
    label("Dread", sy);
    ctx.font = `700 50px ${GOTHIC}`;
    ctx.fillStyle = C.blood;
    const score = String(d.dread.score);
    ctx.fillText(score, statX, sy + 52);
    const sw = ctx.measureText(score).width;
    ctx.font = `24px ${BODY}`;
    ctx.fillStyle = C.inkSoft;
    ctx.fillText("/ 100", statX + sw + 10, sy + 52);
    if (d.dread.label) {
      ctx.font = `italic 24px ${BODY}`;
      ctx.fillStyle = C.ink;
      wrap(ctx, d.dread.label, 250, 2).forEach((line, i) => ctx.fillText(line, statX, sy + 86 + i * 28));
    }
  }

  // Footer.
  ctx.strokeStyle = C.rule;
  ctx.beginPath();
  ctx.moveTo(left, footerTop);
  ctx.lineTo(W - 96, footerTop);
  ctx.stroke();
  ctx.font = `italic 24px ${BODY}`;
  ctx.fillStyle = C.inkSoft;
  const roomLine = wrap(ctx, d.roomName, 430, 1)[0] ?? "";
  ctx.fillText(roomLine, left, footerTop + 42);
  ctx.font = `24px ${BODY}`;
  ctx.fillStyle = C.ink;
  ctx.textAlign = "right";
  ctx.fillText(d.siteUrl, W - 180, footerTop + 42);
  ctx.textAlign = "left";

  drawSeal(ctx, W - 118, footerTop + 32, 36);
}

/* ---------- Actions ---------- */

function toBlob(canvas) {
  return new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Clipboard blocked (insecure origin or permissions): fall back to a selection copy.
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.cssText = "position:fixed;opacity:0;";
    (document.querySelector("dialog[open]") ?? document.body).append(area);
    area.select();
    let ok = false;
    try { ok = document.execCommand("copy"); } catch { ok = false; }
    area.remove();
    return ok;
  }
}

function flash(button, text) {
  const original = button.dataset.label ?? button.textContent;
  button.dataset.label = original;
  button.textContent = text;
  clearTimeout(button._flash);
  button._flash = setTimeout(() => (button.textContent = original), 2200);
}

function slug(s) {
  return String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "room";
}

/* ---------- Rendering into the ending ---------- */

on("game:end", async ({ won, room, hearts, maxHearts, time }) => {
  const host = document.getElementById("ending-extras");
  if (!host || !room) return;
  const token = ++drawToken;

  const link = room.id ? `${location.origin}/?room=${encodeURIComponent(room.id)}` : null;
  const data = {
    won,
    company: room.company || "these",
    hearts: Math.max(0, hearts),
    maxHearts,
    time,
    dread: typeof room.dread?.score === "number" ? room.dread : null,
    verdict: Array.isArray(room.verdict) ? room.verdict : [],
    roomName: api.getTheme?.()?.name ?? "",
    siteUrl: link ? link.replace(/^https?:\/\//, "") : location.host,
  };

  const section = document.createElement("section");
  section.className = "share";
  section.innerHTML = `
    <h3>Dare a friend</h3>
    <div class="share-preview">
      <canvas width="${W}" height="${H}" role="img"></canvas>
    </div>
    <div class="share-actions">
      <button type="button" class="btn btn-seal btn-small share-download">Download card</button>
      <button type="button" class="btn btn-quiet btn-small share-copy">Copy challenge link</button>
      <button type="button" class="btn btn-quiet btn-small share-native">Share</button>
    </div>`;
  const canvas = section.querySelector("canvas");
  const download = section.querySelector(".share-download");
  const copy = section.querySelector(".share-copy");
  const share = section.querySelector(".share-native");
  canvas.setAttribute(
    "aria-label",
    `Share card: ${won ? "I escaped" : "I was bound by"} ${data.company}'s terms, ${data.hearts} of ${maxHearts} hearts left, ${time}.`,
  );
  copy.hidden = !link;
  share.hidden = !navigator.share;
  section.classList.add("drawing");
  host.append(section);

  await waitForFonts();
  if (token !== drawToken || !section.isConnected) return;
  drawCard(canvas, data);
  section.classList.remove("drawing");

  const fileName = `terms-of-dread-${slug(room.company)}.png`;
  const shareText = won
    ? `I escaped ${data.company}'s terms in ${time} with ${data.hearts} of ${maxHearts} hearts left. Can you read your way out?`
    : `I was bound by ${data.company}'s terms. Can you read your way out?`;

  // Made ahead of time, so Share still counts as a direct click.
  const blob = await toBlob(canvas);
  if (token !== drawToken) return;
  const file = blob ? new File([blob], fileName, { type: "image/png" }) : null;
  const canShareFile = Boolean(file && navigator.canShare?.({ files: [file] }));
  if (!link && !canShareFile) share.hidden = true;

  download.addEventListener("click", () => {
    if (!blob) return;
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = fileName;
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  });

  copy.addEventListener("click", async () => {
    const ok = await copyText(link);
    if (ok) {
      flash(copy, "Link copied");
      api.toast(won ? `Challenge link copied. Dare someone to beat ${time}.` : "Challenge link copied. Dare someone to do better.");
    } else {
      api.toast(`Copy this link: ${link}`, { duration: 8000 });
    }
  });

  share.addEventListener("click", async () => {
    const payload = { title: "Terms of Dread", text: shareText };
    if (link) payload.url = link;
    if (canShareFile) payload.files = [file];
    try {
      await navigator.share(payload);
    } catch (err) {
      if (err.name !== "AbortError") api.toast("Sharing didn't work here. Download the card instead.");
    }
  });
});
