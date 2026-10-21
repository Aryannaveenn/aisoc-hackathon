// The séance parlour: velvet, violet light, and a table set for talking to the dead.

import { calmWhenReduced, combine, flame, followPointer } from "./ambient.js";

export default {
  id: "parlour",
  name: "The séance parlour",
  exitName: "The parlour door",
  objects: [
    { id: "crystal-ball", name: "The crystal ball" },
    { id: "spirit-board", name: "The spirit board" },
    { id: "gramophone", name: "The gramophone" },
    { id: "mirror", name: "The veiled mirror" },
    { id: "tarot", name: "The tarot cards" },
  ],

  render({ hotspot, plate, door }) {
    // Velvet swags along the top of the wall.
    const swags = [];
    for (let i = 0; i < 9; i++) {
      const x0 = i * 140 - 40;
      const x1 = x0 + 160;
      swags.push(`<path d="M${x0} 0 Q${(x0 + x1) / 2} 84 ${x1} 0Z" fill="${i % 2 ? "#4f1020" : "#5a1426"}"/>
        <path d="M${x0 + 18} 8 Q${(x0 + x1) / 2} 60 ${x1 - 18} 8" stroke="#3a0a16" stroke-width="3" fill="none"/>
        <path d="M${x0} 0 Q${(x0 + x1) / 2} 84 ${x1} 0" stroke="#8a6a2a" stroke-width="2.5" fill="none" stroke-dasharray="2 5"/>`);
    }
    swags.push(Array.from({ length: 10 }, (_, i) => `<path d="M${i * 140 - 40} 0 v26" stroke="#8a6a2a" stroke-width="3"/><circle cx="${i * 140 - 40}" cy="30" r="5" fill="#b08d3e"/>`).join(""));

    // A tall velvet curtain hanging at the edge of the room.
    const curtain = (x, flip) => `
      <g transform="${flip ? `translate(${2 * x + 56} 0) scale(-1 1)` : ""}">
        <path d="M${x} 0 H${x + 56} C${x + 52} 160 ${x + 30} 260 ${x + 40} 330 C${x + 50} 400 ${x + 60} 470 ${x + 50} 522 H${x}Z" fill="#4a0f1c"/>
        <path d="M${x + 14} 0 C${x + 18} 140 ${x + 10} 260 ${x + 18} 330 C${x + 26} 400 ${x + 22} 470 ${x + 24} 522 M${x + 34} 0 C${x + 36} 140 ${x + 24} 250 ${x + 30} 330 C${x + 36} 420 ${x + 40} 470 ${x + 38} 522" stroke="#2e0710" stroke-width="5" fill="none"/>
        <path d="M${x + 6} 0 C${x + 8} 140 ${x + 2} 260 ${x + 8} 330" stroke="#6a1a2c" stroke-width="2" fill="none"/>
        <path d="M${x + 30} 322 q14 4 22 -2" stroke="#b08d3e" stroke-width="5" fill="none"/>
        <path d="M${x + 50} 324 v14" stroke="#b08d3e" stroke-width="2"/><circle cx="${x + 50}" cy="342" r="5" fill="#b08d3e"/>
        <path d="M${x + 45} 346 l-3 26 M${x + 48} 346 l-1 28 M${x + 52} 346 l1 28 M${x + 55} 346 l3 26" stroke="#8a6a2a" stroke-width="2"/>
      </g>`;

    // The spirit board's alphabet, in two gentle arcs.
    const row = (letters, x0, x1, y, bow, size) =>
      [...letters].map((ch, i) => {
        const t = letters.length === 1 ? 0.5 : i / (letters.length - 1);
        const x = x0 + (x1 - x0) * t;
        const yy = y - Math.sin(t * Math.PI) * bow;
        return `<text x="${x.toFixed(1)}" y="${yy.toFixed(1)}" font-size="${size}" text-anchor="middle">${ch}</text>`;
      }).join("");

    // Tarot cards: backs are violet with a gold star; two lie face up.
    const cardBack = `
      <rect x="-20" y="-28" width="40" height="56" rx="3" fill="#2a1640" stroke="#b08d3e" stroke-width="2"/>
      <rect x="-15" y="-23" width="30" height="46" rx="2" fill="none" stroke="#6e5420" stroke-width="1"/>
      <path d="M0 -10 L3 -3 L10 -3 L4 2 L6 10 L0 5 L-6 10 L-4 2 L-10 -3 L-3 -3Z" fill="#b08d3e"/>`;
    const cardFace = (numeral, art) => `
      <rect x="-20" y="-28" width="40" height="56" rx="3" fill="#e6d6ad" stroke="#6e5420" stroke-width="2"/>
      <rect x="-16" y="-24" width="32" height="48" rx="2" fill="none" stroke="#8a6a2a" stroke-width="1"/>
      <text x="0" y="-14" text-anchor="middle" font-family="IM Fell English, serif" font-size="8" fill="#2b1d12">${numeral}</text>
      ${art}`;
    const moonArt = `<path d="M4 -8 A10 10 0 1 0 4 12 A8 8 0 1 1 4 -8Z" fill="#8a6a2a"/><path d="M-12 20 h24" stroke="#2b1d12" stroke-width="1"/>`;
    const scytheArt = `<path d="M-6 18 L6 -6" stroke="#2b1d12" stroke-width="1.8"/><path d="M6 -6 C-2 -10 -10 -6 -12 2 C-6 -2 0 -4 6 -6Z" fill="#2b1d12"/><circle cx="-3" cy="8" r="4" fill="none" stroke="#2b1d12"/>`;
    const card = (x, y, rot, body, anim = "") =>
      `<g transform="translate(${x} ${y})">${anim}<g transform="rotate(${rot}) scale(1.12 0.86)">${body}</g></g>`;

    // Lace scallops along the front edge of the tablecloth.
    const lace = [];
    for (let a = 8; a <= 172; a += 7) {
      const r = (a * Math.PI) / 180;
      lace.push(`<circle cx="${(640 + Math.cos(r) * 258).toFixed(1)}" cy="${(500 + Math.sin(r) * 77).toFixed(1)}" r="6" fill="#56306a"/>`);
    }

    return `
      <defs>
        <pattern id="parlour-damask" width="80" height="100" patternUnits="userSpaceOnUse">
          <rect width="80" height="100" fill="#271220"/>
          <g fill="#33182b">
            <path d="M40 12 C54 26 56 42 40 56 C24 42 26 26 40 12Z"/>
            <path d="M40 56 C48 66 58 66 62 58 C58 72 46 74 40 68 C34 74 22 72 18 58 C22 66 32 66 40 56Z"/>
            <path d="M40 22 C46 32 46 40 40 46 C34 40 34 32 40 22Z" fill="#2b1424"/>
            <path d="M0 62 C8 72 8 84 0 94 M80 62 C72 72 72 84 80 94 M0 -38 C8 -28 8 -16 0 -6 M80 -38 C72 -28 72 -16 80 -6"/>
            <circle cx="0" cy="0" r="5"/><circle cx="80" cy="0" r="5"/><circle cx="0" cy="100" r="5"/><circle cx="80" cy="100" r="5"/>
            <circle cx="40" cy="86" r="3"/>
          </g>
        </pattern>
        <linearGradient id="parlour-gilt" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#d1aa52"/>
          <stop offset="0.5" stop-color="#8a6a2a"/>
          <stop offset="1" stop-color="#5a4216"/>
        </linearGradient>
        <linearGradient id="parlour-brass" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stop-color="#6e5420"/>
          <stop offset="0.45" stop-color="#d9b35a"/>
          <stop offset="1" stop-color="#7a5c22"/>
        </linearGradient>
        <linearGradient id="parlour-glass" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#3a4a5c"/>
          <stop offset="0.5" stop-color="#1a2230"/>
          <stop offset="1" stop-color="#0c1018"/>
        </linearGradient>
        <linearGradient id="parlour-cloth" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#2e1440"/>
          <stop offset="1" stop-color="#170820"/>
        </linearGradient>
        <radialGradient id="parlour-orb" cx="0.42" cy="0.38" r="0.65">
          <stop offset="0" stop-color="#f1ecff"/>
          <stop offset="0.35" stop-color="#b8a6f2"/>
          <stop offset="0.8" stop-color="#4a3590"/>
          <stop offset="1" stop-color="#22174a"/>
        </radialGradient>
        <radialGradient id="parlour-aura" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stop-color="#c9b8ff" stop-opacity="0.55"/>
          <stop offset="0.4" stop-color="#9f86f0" stop-opacity="0.2"/>
          <stop offset="1" stop-color="#9f86f0" stop-opacity="0"/>
        </radialGradient>
        <radialGradient id="parlour-flame" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stop-color="#f2a63a" stop-opacity="0.6"/>
          <stop offset="1" stop-color="#f2a63a" stop-opacity="0"/>
        </radialGradient>
        <radialGradient id="parlour-spirit" cx="0.54" cy="0.6" r="0.5">
          <stop offset="0" stop-color="#a48cff" stop-opacity="0.2"/>
          <stop offset="1" stop-color="#a48cff" stop-opacity="0"/>
        </radialGradient>
        <radialGradient id="parlour-sconces" cx="0.5" cy="0.36" r="0.4">
          <stop offset="0" stop-color="#f2a63a" stop-opacity="0.12"/>
          <stop offset="1" stop-color="#f2a63a" stop-opacity="0"/>
        </radialGradient>
        <radialGradient id="parlour-vignette" cx="0.5" cy="0.5" r="0.75">
          <stop offset="0.5" stop-color="#05000a" stop-opacity="0"/>
          <stop offset="1" stop-color="#05000a" stop-opacity="0.82"/>
        </radialGradient>
        <filter id="parlour-blur" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="6"/></filter>
        <filter id="parlour-haze" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="2.5"/></filter>
        <clipPath id="parlour-orb-clip"><circle cx="645" cy="390" r="56"/></clipPath>
        <clipPath id="parlour-glass-clip"><path d="M92 462 V194 A63 63 0 0 1 218 194 V462Z"/></clipPath>
      </defs>

      <!-- Walls, wainscot and floor -->
      <rect width="1200" height="522" fill="url(#parlour-damask)"/>
      <rect y="384" width="1200" height="138" fill="#24110c"/>
      ${[60, 250, 440, 630, 820, 1010].map((x) => `<rect x="${x}" y="404" width="170" height="100" fill="none" stroke="#170905" stroke-width="3"/><rect x="${x + 3}" y="407" width="164" height="94" fill="none" stroke="#3a2016" stroke-width="1"/>`).join("")}
      <rect y="378" width="1200" height="12" fill="#3f2114"/><rect y="378" width="1200" height="2" fill="#6a3c22"/>
      <rect y="508" width="1200" height="16" fill="#170905"/>
      <rect y="522" width="1200" height="178" fill="#1a0d0a"/>
      ${[548, 584, 630, 688].map((y) => `<line x1="0" x2="1200" y1="${y}" y2="${y}" stroke="#0f0705" stroke-width="2"/>`).join("")}
      ${[90, 330, 610, 870, 1110].map((x, i) => `<line x1="${x + (i % 2) * 70}" x2="${x + (i % 2) * 70}" y1="524" y2="700" stroke="#0f0705" stroke-width="2"/>`).join("")}
      <ellipse cx="640" cy="664" rx="470" ry="56" fill="#3a0f1a"/>
      <ellipse cx="640" cy="664" rx="450" ry="48" fill="none" stroke="#8a6a2a" stroke-width="3" stroke-dasharray="14 6" opacity="0.6"/>
      <ellipse cx="640" cy="664" rx="420" ry="40" fill="none" stroke="#5a1426" stroke-width="6"/>

      <!-- Curtained window -->
      <g>
        <rect x="556" y="62" width="178" height="168" fill="#2a1410"/>
        <rect x="566" y="72" width="158" height="148" fill="#0b1020"/>
        <circle cx="648" cy="120" r="34" fill="#dfe6f2" opacity="0.18"/>
        <circle cx="648" cy="120" r="16" fill="#e6ecd8"/>
        <path d="M566 72 H640 C632 120 640 170 630 220 H566Z" fill="#4a0f1c"/>
        <path d="M724 72 H652 C660 120 652 170 662 220 H724Z" fill="#4a0f1c"/>
        <path d="M584 72 C580 130 586 180 580 220 M604 72 C602 130 608 180 602 220 M706 72 C710 130 704 180 710 220 M686 72 C688 130 682 180 688 220" stroke="#2e0710" stroke-width="4" fill="none"/>
        <rect x="550" y="56" width="190" height="18" fill="#3f2114"/><rect x="550" y="226" width="190" height="10" fill="#3f2114"/>
      </g>

      ${swags.join("")}
      ${curtain(0, false)}
      ${curtain(1144, true)}

      <!-- Wall sconces -->
      ${[515, 820].map((x, i) => `
        <path d="M${x - 12} 296 h24 l-4 34 h-16z" fill="#6e5420"/>
        <path d="M${x} 312 C${x} 296 ${x} 288 ${x} 278" stroke="#8a6a2a" stroke-width="5" fill="none"/>
        <ellipse cx="${x}" cy="278" rx="14" ry="4" fill="#b08d3e"/>
        <rect x="${x - 5}" y="256" width="10" height="22" fill="#e9dfc6"/>
        <path d="M${x - 14} 278 C${x - 18} 250 ${x - 12} 226 ${x - 8} 214 H${x + 8} C${x + 12} 226 ${x + 18} 250 ${x + 14} 278Z" fill="#f2e6c8" opacity="0.12" stroke="#f2e6c8" stroke-opacity="0.35"/>
        ${flame(x, 256, { size: 0.85, dur: 1.2 + i * 0.3, glow: "parlour-flame" })}`).join("")}

      ${hotspot("mirror", [60, 80, 190, 440], `
        <ellipse cx="155" cy="518" rx="90" ry="6" fill="#050207" opacity="0.7"/>
        <path d="M98 466 L84 516 M212 466 L226 516" stroke="#5a4216" stroke-width="8" stroke-linecap="round"/>
        <path d="M74 516 h22 M214 516 h22" stroke="#8a6a2a" stroke-width="5" stroke-linecap="round"/>
        <path d="M78 474 V192 A77 77 0 0 1 232 192 V474Z" fill="url(#parlour-gilt)"/>
        <path d="M86 470 V194 A69 69 0 0 1 224 194 V470Z" fill="none" stroke="#5a4216" stroke-width="2"/>
        <path d="M130 106 C140 86 170 86 180 106 C170 98 140 98 130 106Z M155 84 C150 92 160 92 155 84Z" fill="#b08d3e"/>
        <circle cx="155" cy="100" r="7" fill="#d1aa52"/>
        <g clip-path="url(#parlour-glass-clip)">
          <rect x="88" y="120" width="134" height="350" fill="url(#parlour-glass)"/>
          <path d="M120 470 L222 300 V340 L150 470Z M170 470 L222 386 V400 L182 470Z" fill="#c7d6e8" opacity="0.07"/>
          <g opacity="0">
            <ellipse cx="186" cy="270" rx="15" ry="19" fill="#d8dfe8"/>
            <path d="M160 360 C160 310 170 292 186 292 C202 292 214 310 214 360Z" fill="#d8dfe8"/>
            <circle cx="180" cy="268" r="2.4" fill="#0c1018"/><circle cx="192" cy="268" r="2.4" fill="#0c1018"/>
            <animate attributeName="opacity" values="0;0;0.22;0.22;0" keyTimes="0;0.7;0.78;0.9;1" dur="17s" begin="4s" repeatCount="indefinite"/>
          </g>
        </g>
        <path d="M70 128 C96 74 214 74 240 134 C230 150 218 160 204 168 C186 214 160 300 150 470 L84 470 C80 380 72 250 70 128Z" fill="#07050a" opacity="0.95"/>
        <path d="M96 100 C110 180 108 300 104 466 M128 90 C140 200 136 330 124 468 M176 92 C182 120 196 150 214 160 M154 88 C160 160 150 260 140 468" stroke="#1d1826" stroke-width="2.5" fill="none"/>
        <path d="M204 168 C186 214 160 300 150 470" stroke="#2c2636" stroke-width="2" stroke-dasharray="1 5" fill="none"/>
        <path d="M200 170 q6 8 10 4 M190 196 q6 6 10 2 M180 226 q6 6 10 2 M170 260 q6 6 10 2 M162 300 q6 6 10 2 M156 340 q6 6 10 2 M152 380 q6 6 10 2 M150 420 q6 6 10 2" stroke="#1d1826" stroke-width="2" fill="none"/>
        ${plate(3, 155, 492)}`)}

      ${door([292, 150, 176, 370], `
        <rect x="292" y="150" width="176" height="372" fill="#2f150d"/>
        <path d="M282 150 H478 L470 136 H290Z" fill="#3f2114"/>
        <path d="M352 136 C362 118 398 118 408 136Z" fill="#3f2114"/>
        <rect x="304" y="162" width="152" height="360" fill="#4a2216" stroke="#1e0c06" stroke-width="3"/>
        <rect x="318" y="178" width="54" height="128" rx="2" fill="#2c1a3c" stroke="#1e0c06" stroke-width="5"/>
        <rect x="388" y="178" width="54" height="128" rx="2" fill="#2c1a3c" stroke="#1e0c06" stroke-width="5"/>
        <path d="M345 182 V302 M318 242 H372 M415 182 V302 M388 242 H442" stroke="#1e0c06" stroke-width="3"/>
        <path d="M322 182 L342 238 M392 182 L412 238" stroke="#8c78d0" stroke-opacity="0.25" stroke-width="3"/>
        <rect x="318" y="326" width="54" height="170" rx="2" fill="none" stroke="#2c1208" stroke-width="5"/>
        <rect x="388" y="326" width="54" height="170" rx="2" fill="none" stroke="#2c1208" stroke-width="5"/>
        <path d="M320 328 v164 M390 328 v164" stroke="#6a3420" stroke-width="1.5"/>
        <rect x="432" y="340" width="12" height="40" rx="3" fill="#8a6a2a"/>
        <circle cx="438" cy="352" r="7" fill="#d1aa52"/>
        <path d="M435 364 h6 l-1 10 h-4z" fill="#140805"/>
        <rect class="door-gap" x="304" y="515" width="152" height="6" fill="#b3f28a" opacity="0.15"/>
        <text x="380" y="114" text-anchor="middle" font-family="UnifrakturCook, serif" font-size="26" fill="#f2a63a">Exit</text>`)}

      <!-- The séance table -->
      <path d="M380 500 C374 580 368 640 362 692 H918 C912 640 906 580 900 500 A260 78 0 0 1 380 500Z" fill="url(#parlour-cloth)"/>
      <path d="M420 560 C414 610 410 650 406 690 M480 574 C478 620 474 660 470 692 M560 580 C560 630 558 660 556 692 M720 580 C720 630 722 660 724 692 M800 574 C802 620 806 660 810 692 M860 560 C866 610 870 650 874 690" stroke="#160820" stroke-width="4" fill="none"/>
      <path d="M362 692 H918" stroke="#8a6a2a" stroke-width="5" stroke-dasharray="2 4"/>
      ${lace.join("")}
      <ellipse cx="640" cy="500" rx="260" ry="78" fill="#341845"/>
      <ellipse cx="640" cy="500" rx="236" ry="66" fill="none" stroke="#5a3370" stroke-width="2" stroke-dasharray="6 4"/>
      ${[[452, 458], [828, 456]].map(([x, y], i) => `
        <ellipse cx="${x}" cy="${y + 12}" rx="14" ry="4" fill="#8a6a2a"/>
        <rect x="${x - 4}" y="${y - 6}" width="8" height="18" fill="#6e5420"/>
        <ellipse cx="${x}" cy="${y - 6}" rx="9" ry="3" fill="#b08d3e"/>
        <rect x="${x - 5}" y="${y - 30}" width="10" height="24" fill="#e9dfc6"/>
        <path d="M${x - 5} ${y - 28} q-2 8 0 12" stroke="#cfc2a2" stroke-width="2" fill="none"/>
        ${flame(x, y - 30, { size: 0.8, dur: 1.4 + i * 0.25, glow: "parlour-flame" })}`).join("")}

      ${hotspot("crystal-ball", [575, 262, 140, 210], `
        <circle class="parlour-aura" cx="645" cy="390" r="150" fill="url(#parlour-aura)">
          <animate attributeName="r" values="140;158;140" dur="5s" repeatCount="indefinite"/>
        </circle>
        <ellipse cx="645" cy="470" rx="46" ry="8" fill="#12061a" opacity="0.7"/>
        <path d="M610 470 L626 444 H664 L680 470 L668 470 L656 452 H634 L622 470Z" fill="#8a6a2a"/>
        <path d="M604 470 h14 M672 470 h14" stroke="#b08d3e" stroke-width="5" stroke-linecap="round"/>
        <ellipse cx="645" cy="444" rx="34" ry="8" fill="url(#parlour-brass)"/>
        <circle cx="645" cy="390" r="58" fill="url(#parlour-orb)"/>
        <g clip-path="url(#parlour-orb-clip)">
          <g filter="url(#parlour-blur)" opacity="0.75">
            <path d="M600 400 C620 370 650 420 690 380 C700 400 680 430 640 420 C620 430 600 420 600 400Z" fill="#f5f1ff"/>
            <path d="M610 360 C630 340 660 360 680 350 C670 372 640 370 610 360Z" fill="#e6defe"/>
            <animateTransform attributeName="transform" type="rotate" values="0 645 390;360 645 390" dur="16s" repeatCount="indefinite"/>
          </g>
          <g filter="url(#parlour-blur)" opacity="0.4">
            <path d="M610 410 C640 390 660 440 690 410 C680 440 640 450 610 410Z" fill="#b3f28a"/>
            <animateTransform attributeName="transform" type="rotate" values="360 645 390;0 645 390" dur="23s" repeatCount="indefinite"/>
          </g>
        </g>
        <circle cx="645" cy="390" r="58" fill="none" stroke="#e9e3ff" stroke-opacity="0.35" stroke-width="2"/>
        <ellipse cx="624" cy="364" rx="16" ry="9" transform="rotate(-35 624 364)" fill="#fff" opacity="0.55"/>
        <circle cx="668" cy="420" r="3" fill="#fff" opacity="0.4"/>
        ${plate(0, 645, 290)}`)}

      ${hotspot("spirit-board", [405, 486, 245, 176], `
        <path d="M434 500 L634 495 L652 574 L418 581Z" fill="#170a10" opacity="0.5" transform="translate(4 5)"/>
        <path d="M434 500 L634 495 L652 574 L418 581Z" fill="#c7a46a" stroke="#4a2e14" stroke-width="3" stroke-linejoin="round"/>
        <path d="M441 505 L628 500 L644 569 L427 575Z" fill="none" stroke="#7a5428" stroke-width="1.2"/>
        <g font-family="IM Fell English, serif" fill="#3a2410">
          ${row("ABCDEFGHIJKLM", 452, 618, 532, 8, 11)}
          ${row("NOPQRSTUVWXYZ", 448, 624, 549, 7, 11.5)}
          ${row("1234567890", 476, 596, 565, 0, 9)}
          <text x="480" y="516" font-size="10" text-anchor="middle">YES</text>
          <text x="600" y="513" font-size="10" text-anchor="middle">NO</text>
        </g>
        <circle cx="452" cy="513" r="4" fill="none" stroke="#3a2410" stroke-width="1.3"/>
        <path d="M452 506 v-2 M452 520 v2 M445 513 h-2 M459 513 h2" stroke="#3a2410" stroke-width="1.1"/>
        <path d="M626 506 A6 6 0 1 0 626 518 A4.6 4.6 0 1 1 626 506Z" fill="#3a2410"/>
        <g>
          <animateTransform attributeName="transform" type="translate" dur="15s" repeatCount="indefinite"
            values="0 0;40 -4;40 -4;84 14;84 14;-44 16;-44 16;-58 -12;-58 -12;0 0"
            keyTimes="0;0.1;0.25;0.35;0.5;0.62;0.75;0.83;0.94;1"/>
          <ellipse cx="530" cy="548" rx="17" ry="6" fill="#170a10" opacity="0.45"/>
          <path d="M530 524 C544 524 550 536 530 552 C510 536 516 524 530 524Z" fill="#efe3c4" stroke="#3a2410" stroke-width="1.6"/>
          <ellipse cx="530" cy="534" rx="5.5" ry="4.2" fill="#a9c1dc" fill-opacity="0.55" stroke="#3a2410" stroke-width="1.2"/>
          <path d="M520 546 l-3 4 M540 546 l3 4" stroke="#3a2410" stroke-width="1.5"/>
        </g>
        ${plate(1, 528, 620)}`)}

      ${hotspot("tarot", [660, 486, 215, 176], `
        <g opacity="0.45" fill="#12061a">
          ${[690, 728, 766, 804, 842].map((x, i) => `<rect x="${x - 18}" y="${520 + (i % 2) * 6}" width="40" height="44" rx="3" transform="rotate(${[-10, -4, 2, 6, 12][i]} ${x} ${540})"/>`).join("")}
        </g>
        ${card(690, 536, -10, cardBack)}
        ${card(766, 538, 2, cardFace("XVIII", moonArt))}
        ${card(842, 536, 12, cardBack)}
        ${card(728, 542, -4, cardFace("XIII", scytheArt), `<animateTransform attributeName="transform" type="translate" additive="sum" dur="12s" repeatCount="indefinite" values="0 0;0 0;76 -2;76 -2;0 0" keyTimes="0;0.4;0.47;0.9;1"/>`)}
        ${card(804, 542, 6, cardBack, `<animateTransform attributeName="transform" type="translate" additive="sum" dur="12s" repeatCount="indefinite" values="0 0;0 0;-76 2;-76 2;0 0" keyTimes="0;0.4;0.47;0.9;1"/>`)}
        ${plate(4, 768, 620)}`)}

      ${hotspot("gramophone", [925, 165, 195, 355], `
        <ellipse cx="1025" cy="518" rx="84" ry="6" fill="#050207" opacity="0.7"/>
        <rect x="952" y="372" width="146" height="134" fill="#3a1a10"/>
        <rect x="944" y="362" width="162" height="12" rx="2" fill="#4f2616"/>
        <rect x="962" y="386" width="58" height="108" rx="3" fill="none" stroke="#24100a" stroke-width="4"/>
        <rect x="1030" y="386" width="58" height="108" rx="3" fill="none" stroke="#24100a" stroke-width="4"/>
        <circle cx="1018" cy="440" r="3" fill="#b08d3e"/><circle cx="1032" cy="440" r="3" fill="#b08d3e"/>
        <path d="M958 506 q-2 10 -8 14 M1092 506 q2 10 8 14" stroke="#3a1a10" stroke-width="7" stroke-linecap="round" fill="none"/>
        <rect x="968" y="324" width="114" height="38" fill="#5a2c18"/>
        <rect x="968" y="324" width="114" height="5" fill="#8a6a2a"/>
        <rect x="968" y="356" width="114" height="4" fill="#8a6a2a"/>
        <path d="M1082 342 h14 v-10" stroke="#8a6a2a" stroke-width="4" fill="none"/><circle cx="1096" cy="330" r="4" fill="#b08d3e"/>
        <ellipse cx="1022" cy="322" rx="48" ry="10" fill="#0a0a0c"/>
        <ellipse cx="1022" cy="322" rx="38" ry="7.5" fill="none" stroke="#25252b" stroke-width="1"/>
        <ellipse cx="1022" cy="322" rx="28" ry="5.5" fill="none" stroke="#25252b" stroke-width="1"/>
        <ellipse cx="1022" cy="322" rx="11" ry="3" fill="#8f1421"/>
        <path d="M1068 318 L1046 322" stroke="#b08d3e" stroke-width="4" stroke-linecap="round"/>
        <path d="M1068 320 C1074 296 1066 270 1046 254" stroke="url(#parlour-brass)" stroke-width="11" fill="none" stroke-linecap="round"/>
        <path d="M1050 262 L1040 244 C1010 268 960 270 934 250 C932 214 962 180 1000 172 C1020 186 1034 214 1050 262Z" fill="url(#parlour-brass)"/>
        <ellipse cx="968" cy="212" rx="36" ry="44" transform="rotate(32 968 212)" fill="#d9b35a"/>
        <ellipse cx="970" cy="214" rx="29" ry="36" transform="rotate(32 970 214)" fill="#3a2a10"/>
        <ellipse cx="974" cy="218" rx="16" ry="20" transform="rotate(32 974 218)" fill="#140c04"/>
        <path d="M1046 254 L956 184 M1046 254 L942 230 M1046 254 L996 172 M1046 254 L986 258" stroke="#6e5420" stroke-width="1.5" opacity="0.7"/>
        <g fill="none" stroke="#e6d6ad" stroke-width="2.5" stroke-linecap="round">
          ${[0, 1, 2].map((i) => `<path d="M930 ${196 - i * 4} q-10 18 0 36" opacity="0">
            <animateTransform attributeName="transform" type="translate" values="0 0;-26 -10" dur="3s" begin="${i}s" repeatCount="indefinite"/>
            <animate attributeName="opacity" values="0;0.6;0" dur="3s" begin="${i}s" repeatCount="indefinite"/></path>`).join("")}
        </g>
        ${plate(2, 1025, 448)}`)}

      <rect width="1200" height="700" fill="url(#parlour-sconces)" pointer-events="none"/>
      <rect width="1200" height="700" fill="url(#parlour-spirit)" pointer-events="none"/>
      <rect width="1200" height="700" fill="url(#parlour-vignette)" pointer-events="none"/>
    `;
  },

  // Fog churns in the crystal ball, the planchette wanders, and the ball
  // burns brighter the closer the cursor comes.
  mount(svg) {
    const aura = svg.querySelector(".parlour-aura");
    const stopFollowing = followPointer(svg, ({ x, y }) => {
      const d = Math.hypot(x - 645, y - 390);
      aura?.setAttribute("opacity", (0.55 + 0.45 * Math.max(0, 1 - d / 450)).toFixed(2));
    });
    return combine(stopFollowing, calmWhenReduced(svg));
  },
};
