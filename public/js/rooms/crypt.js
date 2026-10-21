// The family crypt: cold stone, black candles, and a raven that keeps an eye on you.

import { calmWhenReduced, combine, flame, followPointer } from "./ambient.js";

export default {
  id: "crypt",
  name: "The family crypt",
  exitName: "The iron gate",
  objects: [
    { id: "coffin", name: "The coffin" },
    { id: "candelabra", name: "The candelabra" },
    { id: "angel", name: "The weeping angel" },
    { id: "urn", name: "The funeral urn" },
    { id: "raven", name: "The raven" },
  ],

  render({ hotspot, plate, door }) {
    // Flagstones run towards a vanishing point behind the gate.
    const rays = [];
    for (let xb = -700; xb <= 1900; xb += 190) {
      rays.push(`<line x1="${600 + (xb - 600) * 0.62}" y1="522" x2="${xb}" y2="700" stroke="#0e1113" stroke-width="2"/>`);
    }
    const joints = [546, 580, 626, 688].map((y) => `<line x1="0" x2="1200" y1="${y}" y2="${y}" stroke="#0e1113" stroke-width="2"/>`);

    // Gate bars, clipped to the arch.
    const bars = [];
    for (let x = 492; x <= 680; x += 21) {
      bars.push(`<rect x="${x - 3}" y="130" width="6" height="392" fill="#1b1e21"/><line x1="${x - 1.5}" y1="130" x2="${x - 1.5}" y2="520" stroke="#4a5157" stroke-width="1"/>`);
    }

    // Steps climbing away behind the gate, lit from above.
    const steps = [];
    for (let i = 0; i < 9; i++) {
      const y = 516 - i * 26;
      const inset = i * 7;
      steps.push(`<rect x="${486 + inset}" y="${y - 26}" width="${198 - inset * 2}" height="26" fill="${i % 2 ? "#151b20" : "#131920"}"/>
        <rect x="${486 + inset}" y="${y - 26}" width="${198 - inset * 2}" height="3" fill="#5f7486" opacity="${0.15 + i * 0.05}"/>`);
    }

    const cobweb = (x, y, sx, sy) => `
      <g transform="translate(${x} ${y}) scale(${sx} ${sy})" stroke="#b9c2bb" stroke-opacity="0.28" fill="none" stroke-width="1.2">
        <path d="M0 0 L120 30 M0 0 L95 75 M0 0 L48 112 M0 0 L10 128"/>
        <path d="M24 6 Q28 14 19 15 Q16 20 10 26 Q6 28 2 26"/>
        <path d="M54 13 Q56 30 43 34 Q34 44 22 56 Q14 58 5 58"/>
        <path d="M86 21 Q84 46 66 53 Q50 68 34 84 Q22 90 7 92"/>
        <path d="M112 28 Q106 60 88 70 Q66 88 44 106 Q28 116 9 120"/>
      </g>`;

    return `
      <defs>
        <pattern id="crypt-stone" width="160" height="84" patternUnits="userSpaceOnUse">
          <rect width="160" height="84" fill="#101417"/>
          <rect x="2" y="2" width="94" height="38" rx="4" fill="#252d32"/>
          <rect x="100" y="2" width="58" height="38" rx="4" fill="#2a3237"/>
          <rect x="-30" y="44" width="66" height="38" rx="4" fill="#22292e"/>
          <rect x="130" y="44" width="66" height="38" rx="4" fill="#22292e"/>
          <rect x="40" y="44" width="86" height="38" rx="4" fill="#283035"/>
          <path d="M6 4 H90 M104 4 H150 M44 46 H120" stroke="#3a454c" stroke-opacity="0.55"/>
          <path d="M22 10 l6 9 l-3 10 M118 50 l-5 8 l4 7 M146 12 l-8 6" stroke="#161c20" fill="none"/>
          <circle cx="70" cy="62" r="1.6" fill="#191f23"/><circle cx="30" cy="28" r="1.2" fill="#191f23"/><circle cx="128" cy="24" r="1.4" fill="#191f23"/>
        </pattern>
        <linearGradient id="crypt-vault" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#030405" stop-opacity="0.95"/>
          <stop offset="0.32" stop-color="#030405" stop-opacity="0"/>
        </linearGradient>
        <linearGradient id="crypt-stair-light" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#9fbad0" stop-opacity="0.45"/>
          <stop offset="1" stop-color="#9fbad0" stop-opacity="0"/>
        </linearGradient>
        <linearGradient id="crypt-verdigris" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stop-color="#6f9585"/>
          <stop offset="0.35" stop-color="#4b6d60"/>
          <stop offset="1" stop-color="#22362f"/>
        </linearGradient>
        <linearGradient id="crypt-statue" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stop-color="#5f696e"/>
          <stop offset="0.55" stop-color="#8b9599"/>
          <stop offset="1" stop-color="#a5aeb2"/>
        </linearGradient>
        <radialGradient id="crypt-flame" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stop-color="#f2a63a" stop-opacity="0.55"/>
          <stop offset="1" stop-color="#f2a63a" stop-opacity="0"/>
        </radialGradient>
        <radialGradient id="crypt-candlelight" cx="0.27" cy="0.33" r="0.55">
          <stop offset="0" stop-color="#f2a63a" stop-opacity="0.26"/>
          <stop offset="0.5" stop-color="#f2a63a" stop-opacity="0.07"/>
          <stop offset="1" stop-color="#f2a63a" stop-opacity="0"/>
        </radialGradient>
        <radialGradient id="crypt-moonlight" cx="0.49" cy="0.5" r="0.42">
          <stop offset="0" stop-color="#a8c4d6" stop-opacity="0.16"/>
          <stop offset="1" stop-color="#a8c4d6" stop-opacity="0"/>
        </radialGradient>
        <radialGradient id="crypt-vignette" cx="0.5" cy="0.5" r="0.75">
          <stop offset="0.5" stop-color="#000" stop-opacity="0"/>
          <stop offset="1" stop-color="#000" stop-opacity="0.8"/>
        </radialGradient>
        <filter id="crypt-blur" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="16"/></filter>
        <filter id="crypt-soft" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="4"/></filter>
        <clipPath id="crypt-arch"><path d="M480 522 V258 A105 105 0 0 1 690 258 V522Z"/></clipPath>
      </defs>

      <!-- Walls, vault and floor -->
      <rect width="1200" height="522" fill="url(#crypt-stone)"/>
      <g filter="url(#crypt-blur)" opacity="0.55">
        <ellipse cx="160" cy="360" rx="120" ry="70" fill="#07090a"/>
        <ellipse cx="930" cy="250" rx="90" ry="140" fill="#07090a"/>
        <ellipse cx="1120" cy="420" rx="110" ry="80" fill="#07090a"/>
        <ellipse cx="760" cy="470" rx="80" ry="40" fill="#24402a"/>
      </g>
      <path d="M0 0 H1200 V78 Q900 10 600 78 Q300 10 0 78Z" fill="#07090b"/>
      <path d="M0 78 Q300 10 600 78 Q900 10 1200 78" stroke="#323b41" stroke-width="10" fill="none"/>
      <path d="M0 90 Q300 22 600 90 Q900 22 1200 90" stroke="#1a2024" stroke-width="4" fill="none"/>
      <rect width="1200" height="522" fill="url(#crypt-vault)"/>
      <path d="M262 150 l14 30 l-8 26 l12 32 M1162 260 l-10 26 l6 30 M820 110 l8 20 l-6 18" stroke="#0b0e10" stroke-width="2" fill="none"/>
      ${cobweb(0, 84, 1, 1)}
      ${cobweb(1200, 84, -1.1, 1.05)}

      <rect y="500" width="1200" height="24" fill="#1d2327"/>
      <rect y="500" width="1200" height="3" fill="#39434a"/>
      <rect y="522" width="1200" height="178" fill="#171b1e"/>
      ${rays.join("")}
      ${joints.join("")}
      <path d="M300 600 l40 12 l22 -6 M880 650 l30 -14 l26 8 M1040 560 l24 10" stroke="#0b0d0f" stroke-width="2" fill="none"/>
      <g fill="#263f25" opacity="0.8">
        <path d="M0 524 q10 -14 22 -8 q8 -10 20 -4 q10 -8 22 0 q8 -4 14 12Z M396 524 q8 -10 18 -5 q8 -6 16 0 q6 -2 10 5Z"/>
        <path d="M724 524 q10 -12 22 -6 q10 -8 20 -2 q10 -4 16 8Z M1110 524 q8 -14 22 -8 q10 -10 24 -2 q12 -6 24 0 q10 0 20 10Z"/>
        <path d="M1150 500 q4 -26 -6 -46 q14 18 14 46Z M28 500 q-2 -18 8 -32 q-2 18 4 32Z"/>
      </g>

      <!-- The memorial tablet -->
      <g>
        <rect x="944" y="70" width="206" height="116" rx="4" fill="#353e44" stroke="#14181b" stroke-width="4"/>
        <rect x="954" y="80" width="186" height="96" fill="none" stroke="#4a545a" stroke-width="2"/>
        <g font-family="IM Fell English, serif" text-anchor="middle" fill="#14191c" letter-spacing="1.5">
          <text x="1047" y="104" font-size="15">HERE LIES ONE</text>
          <text x="1047" y="124" font-size="15">WHO SCROLLED TO</text>
          <text x="1047" y="144" font-size="15">THE BOTTOM AND</text>
          <text x="1047" y="164" font-size="15">CLICKED “I AGREE”</text>
        </g>
        <path d="M1130 74 l-12 20 l6 14" stroke="#14181b" stroke-width="2" fill="none"/>
      </g>

      ${hotspot("angel", [50, 112, 190, 408], `
        <path d="M62 520 V212 A83 83 0 0 1 228 212 V520Z" fill="#0c1013" stroke="#353e44" stroke-width="9"/>
        <path d="M70 520 V214 A75 75 0 0 1 220 214 V520Z" fill="url(#crypt-moonlight)" opacity="0.6"/>
        <path d="M225 440 q-14 -40 -2 -80 q-12 -36 0 -74 q-10 -30 2 -56" stroke="#2c4529" stroke-width="3" fill="none"/>
        <g fill="#33522f"><ellipse cx="220" cy="410" rx="7" ry="4" transform="rotate(-30 220 410)"/><ellipse cx="226" cy="352" rx="7" ry="4" transform="rotate(25 226 352)"/><ellipse cx="219" cy="300" rx="7" ry="4" transform="rotate(-20 219 300)"/><ellipse cx="225" cy="246" rx="6" ry="3.5" transform="rotate(30 225 246)"/></g>

        <path d="M127 240 C108 202 88 170 80 126 C68 182 70 252 84 322 C92 342 100 354 110 362 C112 330 116 300 128 282Z" fill="#6c767b"/>
        <path d="M163 240 C182 202 202 170 210 126 C222 182 220 252 206 322 C198 342 190 354 180 362 C178 330 174 300 162 282Z" fill="#949da1"/>
        <path d="M84 170 C96 200 108 222 124 240 M80 220 C92 250 104 268 122 276 M86 280 C96 300 104 316 114 330" stroke="#5d676c" stroke-width="2" fill="none"/>
        <path d="M206 170 C194 200 182 222 166 240 M210 220 C198 250 186 268 168 276 M204 280 C194 300 186 316 176 330" stroke="#7b868b" stroke-width="2" fill="none"/>
        <path d="M120 236 C110 290 102 362 94 432 H196 C188 362 180 290 170 236 Q145 226 120 236Z" fill="url(#crypt-statue)"/>
        <path d="M130 262 C126 322 118 382 110 430 M145 272 V430 M160 262 C164 322 172 382 180 430" stroke="#69737a" stroke-width="2.5" fill="none"/>
        <ellipse cx="145" cy="216" rx="17" ry="20" fill="#959ea2"/>
        <path d="M127 222 C122 196 134 187 145 187 C156 187 168 196 163 222 C160 209 154 201 145 201 C136 201 130 209 127 222Z" fill="#7a8489"/>
        <path d="M128 214 C120 232 122 250 132 260 L138 246Z M162 214 C170 232 168 250 158 260 L152 246Z" fill="#7a8489"/>
        <path d="M108 284 C112 262 124 248 136 240 L142 252 C132 260 124 272 122 286Z" fill="#879095"/>
        <path d="M182 284 C178 262 166 248 154 240 L148 252 C158 260 166 272 168 286Z" fill="#a1aaae"/>
        <rect x="129" y="207" width="16" height="36" rx="8" fill="#aab3b6" stroke="#5f696e" stroke-width="1.3" transform="rotate(-11 137 243)"/>
        <rect x="145" y="207" width="16" height="36" rx="8" fill="#bcc4c7" stroke="#5f696e" stroke-width="1.3" transform="rotate(11 153 243)"/>
        <path d="M132 214 l1 7 M137 211 l0 8 M153 211 l0 8 M158 214 l-1 7" stroke="#7a8489" stroke-width="1.1" transform="translate(0 0)"/>

        <rect x="70" y="430" width="150" height="14" fill="#4b555b"/>
        <rect x="78" y="444" width="134" height="64" fill="#3a4349"/>
        <rect x="70" y="506" width="150" height="14" fill="#2b3237"/>
        <path d="M78 444 h134" stroke="#5c676d" stroke-width="2"/>
        <ellipse cx="88" cy="506" rx="18" ry="5" fill="#2f4a2b"/>
        ${plate(2, 145, 474)}`)}

      ${hotspot("candelabra", [262, 168, 130, 352], `
        <ellipse cx="327" cy="518" rx="50" ry="6" fill="#050506" opacity="0.7"/>
        <path d="M327 486 L284 516 M327 486 L370 516 M327 486 V516" stroke="#1a1c1f" stroke-width="6" stroke-linecap="round"/>
        <circle cx="282" cy="512" r="5" fill="none" stroke="#1a1c1f" stroke-width="4"/><circle cx="372" cy="512" r="5" fill="none" stroke="#1a1c1f" stroke-width="4"/>
        <rect x="323" y="232" width="8" height="258" fill="#1d2023"/>
        <line x1="325" y1="234" x2="325" y2="486" stroke="#4a5157" stroke-width="1.4"/>
        <ellipse cx="327" cy="362" rx="9" ry="6" fill="#25292d"/><ellipse cx="327" cy="452" rx="11" ry="7" fill="#25292d"/>
        <path d="M327 306 C327 276 287 292 287 256 M327 306 C327 276 367 292 367 256" stroke="#1d2023" stroke-width="6" fill="none"/>
        <path d="M325 302 C322 280 290 294 289 258" stroke="#4a5157" stroke-width="1.2" fill="none"/>
        <path d="M296 286 q-10 -2 -12 8 q8 0 10 -6 M358 286 q10 -2 12 8 q-8 0 -10 -6" stroke="#1d2023" stroke-width="3" fill="none"/>
        <ellipse cx="327" cy="306" rx="20" ry="5" fill="#25292d"/>
        <ellipse cx="287" cy="256" rx="13" ry="4" fill="#25292d"/><ellipse cx="367" cy="256" rx="13" ry="4" fill="#25292d"/><ellipse cx="327" cy="232" rx="13" ry="4" fill="#25292d"/>

        <rect x="280" y="218" width="14" height="38" fill="#1b181d"/><rect x="360" y="214" width="14" height="42" fill="#1b181d"/><rect x="320" y="186" width="14" height="46" fill="#1b181d"/>
        <path d="M282 220 v22 M362 216 v24 M322 188 v30" stroke="#4a4350" stroke-width="2"/>
        <g fill="#09080a">
          <path d="M280 220 q-3 10 0 18 q3 -4 2 -18Z M292 220 q3 14 0 30 q-3 -6 -2 -30Z"/>
          <path d="M372 216 q4 16 0 34 q-3 -10 -2 -34Z M276 256 q-2 16 2 30 q4 -12 0 -30Z"/>
          <path d="M320 188 q-3 12 0 22 q3 -6 2 -22Z M332 190 q3 18 -1 40 q-2 -14 -1 -40Z"/>
          <path d="M378 256 q3 14 0 24 q-4 -8 -2 -24Z M314 232 q-3 14 2 26 q3 -12 0 -26Z M336 306 q2 20 -2 34 q-4 -14 -2 -34Z"/>
          <path d="M320 308 q-2 12 1 18 q3 -6 1 -18Z"/>
          <ellipse cx="340" cy="514" rx="16" ry="3"/>
        </g>
        ${flame(287, 218, { size: 0.9, dur: 1.2, glow: "crypt-flame" })}
        ${flame(367, 214, { size: 0.9, dur: 1.5, glow: "crypt-flame" })}
        ${flame(327, 186, { size: 1, dur: 1.35, glow: "crypt-flame" })}
        ${plate(1, 327, 400)}`)}

      <!-- The iron gate -->
      ${door([455, 118, 260, 404], `
        <g clip-path="url(#crypt-arch)">
          <rect x="480" y="150" width="210" height="372" fill="#090d10"/>
          ${steps.join("")}
          <path class="door-gap" d="M562 282 V226 A23 23 0 0 1 608 226 V282Z" fill="#b3f28a" opacity="0.15"/>
          <path d="M566 282 V228 A19 19 0 0 1 604 228 V282Z" fill="none" stroke="#9fbad0" stroke-opacity="0.35" stroke-width="2"/>
          <rect x="480" y="150" width="210" height="372" fill="url(#crypt-stair-light)"/>
          ${bars.join("")}
          <rect x="480" y="300" width="210" height="7" fill="#1b1e21"/><rect x="480" y="300" width="210" height="1.5" fill="#4a5157"/>
          <rect x="480" y="462" width="210" height="7" fill="#1b1e21"/><rect x="480" y="462" width="210" height="1.5" fill="#4a5157"/>
          <path d="M585 300 C560 270 548 240 585 214 C622 240 610 270 585 300Z" fill="none" stroke="#1b1e21" stroke-width="6"/>
          <path d="M585 300 C566 278 560 252 585 232 C610 252 604 278 585 300Z" fill="none" stroke="#1b1e21" stroke-width="4"/>
        </g>
        <rect x="602" y="370" width="34" height="46" rx="3" fill="#24282b" stroke="#0d0f10" stroke-width="2"/>
        <circle cx="619" cy="388" r="5" fill="#050606"/><path d="M616 390 h6 l-1 12 h-4z" fill="#050606"/>
        <path d="M484 340 h20 M484 440 h20" stroke="#2e3236" stroke-width="7" stroke-linecap="round"/>
        <path d="M455 522 V258 A130 130 0 0 1 715 258 V522 H690 V258 A105 105 0 0 0 480 258 V522Z" fill="#3a4348"/>
        <path d="M480 258 A105 105 0 0 1 690 258" stroke="#4f5a60" stroke-width="3" fill="none"/>
        ${[-60, -30, 0, 30, 60].map((a) => {
          const r = (a * Math.PI) / 180;
          return `<line x1="${585 + Math.sin(r) * 105}" y1="${258 - Math.cos(r) * 105}" x2="${585 + Math.sin(r) * 130}" y2="${258 - Math.cos(r) * 130}" stroke="#20272b" stroke-width="2"/>`;
        }).join("")}
        <path d="M570 128 L600 128 L606 160 L564 160Z" fill="#4a545a" stroke="#20272b" stroke-width="2"/>
        <path d="M455 330 h25 M455 410 h25 M690 360 h25 M690 450 h25" stroke="#20272b" stroke-width="2"/>
        <path d="M455 522 V258 M715 258 V522" stroke="#20272b" stroke-width="3"/>
        <text x="585" y="104" text-anchor="middle" font-family="UnifrakturCook, serif" font-size="28" fill="#f2a63a">Exit</text>`)}

      ${hotspot("raven", [770, 162, 140, 358], `
        <ellipse cx="840" cy="518" rx="44" ry="5" fill="#050506" opacity="0.7"/>
        <path d="M802 518 Q840 496 878 518Z" fill="#1d2023"/>
        <rect x="836" y="300" width="8" height="206" fill="#1d2023"/>
        <line x1="838" y1="302" x2="838" y2="504" stroke="#4a5157" stroke-width="1.2"/>
        <rect x="786" y="294" width="108" height="9" rx="4.5" fill="#24282c"/>
        <path d="M790 298 h100" stroke="#4a5157" stroke-width="1.2"/>
        <circle cx="786" cy="298" r="6" fill="#24282c"/><circle cx="894" cy="298" r="6" fill="#24282c"/>
        <g fill="#5c4630" opacity="0.8"><path d="M856 504 q10 -4 18 4 q-10 2 -18 -4Z"/></g>

        <g transform="translate(840 296) scale(1.3) translate(-840 -296)">
          <path d="M818 284 L784 334 L798 330 L790 346 L806 334 L804 348 L828 296Z" fill="#0b0c10"/>
          <path d="M806 286 C800 258 822 234 848 236 C868 238 876 256 870 274 C864 290 846 298 822 296Z" fill="#0d0f13"/>
          <path d="M812 282 C812 264 826 250 846 252 C836 264 830 278 816 290Z" fill="#1d2633"/>
          <path d="M820 270 q12 -6 22 -2 M818 280 q12 -6 24 -2 M824 290 q10 -4 20 -2" stroke="#2f3b4c" stroke-width="1.5" fill="none"/>
          <path d="M834 296 l-4 6 M838 296 l0 7 M848 296 l-2 7 M852 296 l2 7" stroke="#3b3b40" stroke-width="2" stroke-linecap="round"/>
          <g class="crypt-raven-head">
            <path d="M842 250 C836 236 842 216 858 214 C872 212 880 224 876 238 C872 248 860 254 848 254Z" fill="#0d0f13"/>
            <path d="M872 222 L900 230 L872 236Z" fill="#2c2d33"/><path d="M872 229 L900 230" stroke="#0b0c0f" stroke-width="1"/>
            <circle cx="866" cy="224" r="3.4" fill="#e8d79e"/><circle cx="867" cy="224" r="1.6" fill="#050506"/>
            <path d="M846 220 q8 -6 18 -6" stroke="#2f3b4c" stroke-width="1.5" fill="none"/>
          </g>
        </g>
        <text x="840" y="186" text-anchor="middle" font-family="IM Fell English, serif" font-style="italic" font-size="20" fill="#e6d6ad" opacity="0">Nevermore…
          <animate attributeName="opacity" values="0;0;0.85;0.85;0" keyTimes="0;0.82;0.86;0.95;1" dur="19s" begin="6s" repeatCount="indefinite"/></text>
        ${plate(4, 840, 410)}`)}

      ${hotspot("urn", [962, 228, 166, 292], `
        <ellipse cx="1045" cy="518" rx="64" ry="6" fill="#050506" opacity="0.7"/>
        <rect x="990" y="504" width="110" height="16" fill="#2b3237"/>
        <rect x="1000" y="406" width="90" height="100" fill="#3a4349"/>
        ${[1014, 1030, 1046, 1062, 1078].map((x) => `<line x1="${x}" y1="410" x2="${x}" y2="502" stroke="#2b3237" stroke-width="3"/><line x1="${x + 2}" y1="410" x2="${x + 2}" y2="502" stroke="#4d585e" stroke-width="1"/>`).join("")}
        <rect x="990" y="392" width="110" height="14" fill="#4b555b"/>
        <path d="M990 392 h110" stroke="#5c676d" stroke-width="2"/>
        <path d="M1022 392 H1068 L1060 378 H1030Z" fill="#3a574c"/>
        <path d="M1030 378 C990 362 984 302 1012 282 H1078 C1106 302 1100 362 1060 378Z" fill="url(#crypt-verdigris)"/>
        <path d="M1016 282 C1022 270 1026 262 1030 256 H1060 C1064 262 1068 270 1074 282Z" fill="#3e5f53"/>
        <rect x="1021" y="248" width="48" height="10" rx="3" fill="#5a8070"/>
        <path d="M1026 248 C1028 232 1062 232 1064 248Z" fill="#4b6d60"/>
        <circle cx="1045" cy="230" r="6" fill="#5a8070"/>
        <path d="M1028 262 C1006 258 1000 278 1012 290 M1062 262 C1084 258 1090 278 1078 290" stroke="#5a8070" stroke-width="5" fill="none"/>
        <path d="M998 304 h94 M996 356 h98" stroke="#7fa595" stroke-width="2" stroke-opacity="0.7"/>
        <path d="M1000 312 q6 -6 12 0 t12 0 t12 0 t12 0 t12 0 t12 0 t12 0" stroke="#22362f" stroke-width="1.5" fill="none"/>
        <text x="1046" y="343" text-anchor="middle" font-family="IM Fell English, serif" font-size="25" fill="#7fa595" opacity="0.6">E · V</text>
        <text x="1045" y="342" text-anchor="middle" font-family="IM Fell English, serif" font-size="25" fill="#1a2b25">E · V</text>
        <circle cx="1062" cy="252" r="7.5" fill="#8f1421"/><circle cx="1062" cy="252" r="4" fill="none" stroke="#5e0c15" stroke-width="1.5"/>
        <path d="M1062 259 l-3 12 M1064 259 l4 10" stroke="#8f1421" stroke-width="2"/>
        <path d="M1004 300 C1000 320 1004 346 1020 366" stroke="#9cc2b0" stroke-width="2" stroke-opacity="0.4" fill="none"/>
        ${plate(3, 1045, 452)}`)}

      <rect width="1200" height="700" fill="url(#crypt-candlelight)" pointer-events="none"/>
      <rect width="1200" height="700" fill="url(#crypt-moonlight)" pointer-events="none"/>
      <path d="M480 522 L690 522 L860 700 L320 700Z" fill="#a8c4d6" opacity="0.05" pointer-events="none"/>

      ${hotspot("coffin", [140, 546, 432, 140], `
        <ellipse cx="360" cy="684" rx="230" ry="9" fill="#050506" opacity="0.7"/>
        <path d="M150 600 L560 600 L556 676 L154 676Z" fill="#454e53"/>
        <rect x="144" y="672" width="422" height="12" fill="#2d3438"/>
        <path d="M150 600 L166 566 L548 566 L560 600Z" fill="#040506"/>
        <path d="M156 598 L170 570 L190 570 L178 598Z" fill="#b3f28a" opacity="0.08"/>
        <g filter="url(#crypt-blur)" opacity="0.6" pointer-events="none">
          <ellipse cx="172" cy="574" rx="26" ry="14" fill="#c9d6c4" opacity="0.5">
            <animate attributeName="cy" values="584;548;584" dur="8s" repeatCount="indefinite"/>
            <animate attributeName="opacity" values="0.15;0.55;0.15" dur="8s" repeatCount="indefinite"/>
          </ellipse>
          <ellipse cx="190" cy="560" rx="30" ry="12" fill="#c9d6c4" opacity="0.3">
            <animate attributeName="cx" values="176;206;176" dur="11s" repeatCount="indefinite"/>
          </ellipse>
        </g>
        <path d="M196 552 L590 560 L600 594 L188 590Z" fill="#5b6469"/>
        <path d="M188 590 L600 594 L600 607 L188 603Z" fill="#3c4449"/>
        <path d="M212 558 L574 565 L582 588 L206 585Z" fill="none" stroke="#4a5358" stroke-width="2"/>
        <path d="M200 553 L590 561" stroke="#788287" stroke-width="2"/>
        <path d="M380 558 L392 572 L384 588 M384 574 l12 6" stroke="#262c30" stroke-width="2" fill="none"/>
        <rect x="270" y="616" width="272" height="46" fill="#3d454a" stroke="#2b3236" stroke-width="2"/>
        <text x="407" y="646" text-anchor="middle" font-family="IM Fell English, serif" font-size="18" letter-spacing="3" fill="#62707a" opacity="0.7">IN PERPETUITY</text>
        <text x="406" y="645" text-anchor="middle" font-family="IM Fell English, serif" font-size="18" letter-spacing="3" fill="#1d2326">IN PERPETUITY</text>
        <path d="M520 606 l-10 22 l8 18 l-6 18" stroke="#262c30" stroke-width="2" fill="none"/>
        <path d="M150 600 L154 676" stroke="#596369" stroke-width="2"/>
        <ellipse cx="560" cy="604" rx="14" ry="5" fill="#2f4a2b"/><ellipse cx="158" cy="674" rx="16" ry="5" fill="#2f4a2b"/>
        ${plate(0, 210, 630)}`)}

      <!-- Fog creeping over the floor -->
      <g filter="url(#crypt-blur)" pointer-events="none" opacity="0.5">
        <g>
          <ellipse cx="180" cy="660" rx="220" ry="34" fill="#a9b8c0" opacity="0.18"/>
          <ellipse cx="760" cy="676" rx="260" ry="30" fill="#a9b8c0" opacity="0.15"/>
          <ellipse cx="1120" cy="640" rx="180" ry="26" fill="#a9b8c0" opacity="0.14"/>
          <animateTransform attributeName="transform" type="translate" values="-40 0;50 -4;-40 0" dur="26s" repeatCount="indefinite"/>
        </g>
        <g>
          <ellipse cx="480" cy="630" rx="200" ry="22" fill="#a9b8c0" opacity="0.12"/>
          <ellipse cx="980" cy="560" rx="160" ry="18" fill="#a9b8c0" opacity="0.1"/>
          <animateTransform attributeName="transform" type="translate" values="40 0;-50 3;40 0" dur="33s" repeatCount="indefinite"/>
        </g>
      </g>

      <rect width="1200" height="700" fill="url(#crypt-vignette)" pointer-events="none"/>
    `;
  },

  // The raven turns its head to keep watching the cursor.
  mount(svg) {
    const head = svg.querySelector(".crypt-raven-head");
    if (head) Object.assign(head.style, { transformOrigin: "857px 246px", transition: "transform 0.35s ease-out" });
    const stopFollowing = followPointer(svg, ({ x, y }) => {
      if (!head) return;
      const hx = 863;
      const hy = 210;
      const facingLeft = x < hx - 20;
      const tilt = Math.max(-18, Math.min(18, ((y - hy) / 300) * 18)) * (facingLeft ? -1 : 1);
      head.style.transform = `scaleX(${facingLeft ? -1 : 1}) rotate(${tilt.toFixed(1)}deg)`;
    });
    return combine(stopFollowing, calmWhenReduced(svg));
  },
};
