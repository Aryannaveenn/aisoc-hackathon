// The nursery: faded wallpaper, cold moonlight, and toys that move when you look away.

import { calmWhenReduced, combine, followPointer } from "./ambient.js";

export default {
  id: "nursery",
  name: "The nursery",
  exitName: "The nursery door",
  objects: [
    { id: "rocking-horse", name: "The rocking horse" },
    { id: "music-box", name: "The music box" },
    { id: "doll", name: "The porcelain doll" },
    { id: "dollhouse", name: "The dollhouse" },
    { id: "wardrobe", name: "The wardrobe" },
  ],

  render({ hotspot, plate, door }) {
    // Floorboards run towards a vanishing point behind the door.
    const boards = [];
    for (let xb = -900; xb <= 2100; xb += 80) {
      boards.push(`<line x1="${(600 + (xb - 600) * 0.66).toFixed(1)}" y1="522" x2="${xb}" y2="700" stroke="#1d1712" stroke-width="2"/>`);
    }

    // Toy blocks that spell out what you did.
    const block = (x, y, letter, color, rot = 0) => `
      <g transform="rotate(${rot} ${x + 17} ${y + 17})">
        <path d="M${x} ${y} l8 -8 h34 l-8 8z" fill="${color}" opacity="0.75"/>
        <path d="M${x + 34} ${y} l8 -8 v34 l-8 8z" fill="#1d1712" opacity="0.55"/>
        <rect x="${x}" y="${y}" width="34" height="34" fill="${color}" stroke="#1d1712" stroke-width="1.5"/>
        <rect x="${x + 4}" y="${y + 4}" width="26" height="26" fill="none" stroke="#e6d6ad" stroke-opacity="0.35"/>
        <text x="${x + 17}" y="${y + 26}" text-anchor="middle" font-family="IM Fell English, serif" font-size="22" fill="#e6d6ad">${letter}</text>
      </g>`;

    // Pencil marks on the door frame where someone measured a child.
    const heights = [[440, "1889"], [404, "1890"], [372, "1891"], [352, "1892"]]
      .map(([y, year]) => `<path d="M592 ${y} h14" stroke="#c9c0b0" stroke-opacity="0.5" stroke-width="1.5"/><text x="609" y="${y + 3}" font-family="IM Fell English, serif" font-size="9" fill="#c9c0b0" opacity="0.45">${year}</text>`)
      .join("");

    return `
      <defs>
        <pattern id="nursery-paper" width="48" height="64" patternUnits="userSpaceOnUse">
          <rect width="48" height="64" fill="#37303d"/>
          <rect width="14" height="64" fill="#3e3645"/>
          <line x1="14" x2="14" y1="0" y2="64" stroke="#2e2833" stroke-width="1"/>
          <g transform="translate(31 18)">
            <circle cx="0" cy="-3" r="2.6" fill="#5b4a58"/><circle cx="3" cy="0" r="2.6" fill="#5b4a58"/>
            <circle cx="0" cy="3" r="2.6" fill="#5b4a58"/><circle cx="-3" cy="0" r="2.6" fill="#5b4a58"/>
            <circle r="1.5" fill="#7d6d4f"/>
            <path d="M2 4 q4 6 0 10" stroke="#46524a" stroke-width="1.2" fill="none"/>
          </g>
          <circle cx="31" cy="50" r="1.4" fill="#4d4150"/><circle cx="7" cy="34" r="1.2" fill="#4a4250"/>
        </pattern>
        <linearGradient id="nursery-night" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#0d1630"/>
          <stop offset="1" stop-color="#1b2848"/>
        </linearGradient>
        <radialGradient id="nursery-moonglow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stop-color="#dfe8ff" stop-opacity="0.6"/>
          <stop offset="1" stop-color="#dfe8ff" stop-opacity="0"/>
        </radialGradient>
        <radialGradient id="nursery-moonlight" cx="0.14" cy="0.22" r="0.75">
          <stop offset="0" stop-color="#bcd3ff" stop-opacity="0.24"/>
          <stop offset="0.45" stop-color="#bcd3ff" stop-opacity="0.07"/>
          <stop offset="1" stop-color="#bcd3ff" stop-opacity="0"/>
        </radialGradient>
        <radialGradient id="nursery-window-lit" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stop-color="#f2a63a" stop-opacity="0.6"/>
          <stop offset="1" stop-color="#f2a63a" stop-opacity="0"/>
        </radialGradient>
        <radialGradient id="nursery-vignette" cx="0.5" cy="0.5" r="0.75">
          <stop offset="0.5" stop-color="#03020a" stop-opacity="0"/>
          <stop offset="1" stop-color="#03020a" stop-opacity="0.8"/>
        </radialGradient>
        <filter id="nursery-blur" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="14"/></filter>
        <filter id="nursery-glow" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="1.6"/></filter>
      </defs>

      <!-- Walls, wainscot and floor -->
      <rect width="1200" height="362" fill="url(#nursery-paper)"/>
      <g filter="url(#nursery-blur)" opacity="0.7">
        <ellipse cx="300" cy="40" rx="90" ry="50" fill="#221d27"/>
        <ellipse cx="840" cy="120" rx="60" ry="110" fill="#221d27"/>
        <ellipse cx="560" cy="330" rx="70" ry="26" fill="#221d27"/>
      </g>
      <rect width="1200" height="14" fill="#2a252c"/><rect y="14" width="1200" height="4" fill="#4a4450"/>
      <path d="M946 18 L990 18 L980 70 Z" fill="#1c1820"/>
      <path d="M946 18 L990 18 C984 34 972 40 960 34 C954 30 950 24 946 18Z" fill="#4c4354"/>
      <path d="M948 20 C956 30 970 36 984 24" stroke="#5d5266" stroke-width="1.5" fill="none"/>
      <rect y="362" width="1200" height="142" fill="#2b3330"/>
      ${Array.from({ length: 50 }, (_, i) => `<line x1="${i * 24 + 12}" x2="${i * 24 + 12}" y1="366" y2="504" stroke="#212825" stroke-width="2"/>`).join("")}
      <rect y="352" width="1200" height="12" fill="#4a4c46"/><rect y="352" width="1200" height="2" fill="#6a6c64"/>
      <rect y="504" width="1200" height="18" fill="#1e2421"/>
      <rect y="522" width="1200" height="178" fill="#2b231d"/>
      ${boards.join("")}
      <path d="M150 522 L300 522 L540 700 L250 700Z" fill="#bcd3ff" opacity="0.06"/>
      <path d="M222 522 L230 522 L400 700 L388 700Z M150 600 L470 600" stroke="#2b231d" stroke-width="6" opacity="0.5"/>
      <ellipse cx="610" cy="644" rx="230" ry="46" fill="#3a3040"/>
      <ellipse cx="610" cy="644" rx="200" ry="38" fill="none" stroke="#4d3f4c" stroke-width="7"/>
      <ellipse cx="610" cy="644" rx="160" ry="30" fill="none" stroke="#45505a" stroke-width="7"/>
      <ellipse cx="610" cy="644" rx="118" ry="22" fill="none" stroke="#56404a" stroke-width="7"/>

      <!-- The window and the moon -->
      <g>
        <rect x="70" y="60" width="170" height="240" fill="#5d6670"/>
        <rect x="82" y="72" width="146" height="216" fill="url(#nursery-night)"/>
        <circle cx="180" cy="132" r="64" fill="url(#nursery-moonglow)"/>
        <circle cx="180" cy="132" r="26" fill="#e8eedc"/>
        <circle cx="172" cy="124" r="5" fill="#cdd5c4"/><circle cx="190" cy="142" r="6" fill="#cdd5c4"/>
        <path d="M82 180 Q120 168 150 182 Q190 166 228 182" stroke="#5d6a86" stroke-width="7" stroke-opacity="0.35" fill="none"/>
        <path d="M82 246 C112 230 130 238 160 210 C170 200 182 198 196 188 M130 236 C134 222 146 214 150 200 M160 210 C176 214 190 222 206 220 M82 270 C100 262 116 262 128 256" stroke="#05070d" stroke-width="4" fill="none" stroke-linecap="round"/>
        <rect x="152" y="72" width="6" height="216" fill="#5d6670"/><rect x="82" y="177" width="146" height="6" fill="#5d6670"/>
        <path d="M208 72 L196 100 L206 112 M196 100 L184 104" stroke="#aab4c4" stroke-opacity="0.5" fill="none"/>
        <rect x="62" y="296" width="186" height="12" fill="#6b747e"/>
        <path d="M70 60 C80 120 76 200 90 264 L100 300 L84 290 L76 302 L70 290Z" fill="#c9c0d8" opacity="0.28">
          <animate attributeName="d" dur="9s" repeatCount="indefinite"
            values="M70 60 C80 120 76 200 90 264 L100 300 L84 290 L76 302 L70 290Z;M70 60 C88 120 90 200 108 262 L118 296 L100 288 L88 300 L70 290Z;M70 60 C80 120 76 200 90 264 L100 300 L84 290 L76 302 L70 290Z"/>
        </path>
        <rect x="60" y="54" width="190" height="8" fill="#4a4c46"/>
      </g>

      <!-- A mobile turning slowly over the dollhouse -->
      <g>
        <animateTransform attributeName="transform" type="rotate" values="-4 455 0;4 455 0;-4 455 0" dur="8s" repeatCount="indefinite"/>
        <path d="M455 14 V52 M405 52 H505 M405 52 V96 M455 52 V114 M505 52 V92" stroke="#9a948a" stroke-opacity="0.6" stroke-width="1.5"/>
        <path d="M417 106 A13 13 0 1 1 405 92 A10 10 0 1 0 417 106Z" fill="#c9bf9a"/>
        <path d="M455 112 l4 9 h10 l-8 6 l3 10 l-9 -6 l-9 6 l3 -10 l-8 -6 h10z" fill="#b8a77a"/>
        <path d="M490 100 q0 -12 12 -10 q4 -8 12 -2 q10 0 8 10 q0 8 -10 6 h-14 q-8 2 -8 -4z" fill="#8f9bb0"/>
      </g>

      ${hotspot("dollhouse", [320, 210, 220, 310], `
        <ellipse cx="430" cy="518" rx="116" ry="6" fill="#0c0a08" opacity="0.6"/>
        <rect x="324" y="470" width="212" height="12" fill="#5a4636"/>
        <rect x="334" y="482" width="192" height="22" fill="#4a3a2c"/>
        <path d="M340 504 v16 M520 504 v16" stroke="#4a3a2c" stroke-width="7"/>
        <rect x="488" y="232" width="18" height="44" fill="#4a3a40"/><rect x="484" y="228" width="26" height="7" fill="#5a4850"/>
        <rect x="344" y="296" width="172" height="174" fill="#6e5a64"/>
        ${Array.from({ length: 11 }, (_, i) => `<line x1="344" x2="516" y1="${306 + i * 15}" y2="${306 + i * 15}" stroke="#5e4c56" stroke-width="1.5"/>`).join("")}
        <path d="M330 302 L430 212 L530 302Z" fill="#33282f"/>
        <path d="M352 284 h156 M372 266 h116 M392 248 h76 M412 230 h36" stroke="#241c22" stroke-width="2" stroke-dasharray="5 3"/>
        <path d="M330 302 L430 212 L530 302" stroke="#b9b0a8" stroke-width="4" fill="none" stroke-linejoin="round"/>
        <circle cx="430" cy="270" r="13" fill="#b9b0a8"/><circle cx="430" cy="270" r="10" fill="#14121a"/>
        <circle cx="430" cy="270" r="10" fill="#b3f28a" opacity="0">
          <animate attributeName="opacity" values="0;0;0.45;0;0.35;0" keyTimes="0;0.8;0.83;0.86;0.9;1" dur="13s" repeatCount="indefinite"/>
        </circle>
        <path d="M430 260 v20 M420 270 h20" stroke="#b9b0a8" stroke-width="2"/>
        ${[[358, 314], [416, 314], [474, 314], [358, 390], [474, 390]].map(([x, y], i) => `
          <rect x="${x - 3}" y="${y - 3}" width="34" height="42" fill="#b9b0a8"/>
          <rect x="${x}" y="${y}" width="28" height="36" fill="${i === 2 ? "#f2a63a" : "#1a1822"}" ${i === 2 ? 'opacity="0.85"' : ""}/>
          ${i === 2 ? `<path d="M${x + 10} ${y + 36} v-10 a4 4 0 1 1 8 0 v10z M${x + 14} ${y + 16} a3.6 3.6 0 1 1 0.1 0" fill="#2b1608"/>` : `<path d="M${x} ${y} q7 14 0 36 M${x + 28} ${y} q-7 14 0 36" stroke="#8a7a86" stroke-width="2" fill="none"/>`}
          <path d="M${x + 14} ${y} v36 M${x} ${y + 18} h28" stroke="#b9b0a8" stroke-width="2"/>
          <rect x="${x - 5}" y="${y + 36}" width="38" height="5" fill="#b9b0a8"/>`).join("")}
        <circle cx="490" cy="332" r="26" fill="url(#nursery-window-lit)">
          <animate attributeName="opacity" values="1;0.7;1;0.85;1" dur="2.4s" repeatCount="indefinite"/>
        </circle>
        <path d="M404 412 L430 396 L456 412Z" fill="#33282f"/>
        <rect x="416" y="414" width="28" height="56" fill="#3a2e34" stroke="#b9b0a8" stroke-width="3"/>
        <circle cx="438" cy="444" r="2" fill="#c9b27a"/>
        <rect x="408" y="466" width="44" height="5" fill="#8a8078"/>
        ${plate(3, 430, 492)}`)}

      ${door([590, 150, 170, 370], `
        <rect x="590" y="150" width="170" height="372" fill="#4f5862"/>
        <rect x="590" y="150" width="170" height="6" fill="#68717b"/>
        <rect x="602" y="162" width="146" height="360" fill="#3b4652" stroke="#262e37" stroke-width="3"/>
        <rect x="616" y="178" width="52" height="130" rx="2" fill="none" stroke="#2a333d" stroke-width="5"/>
        <rect x="682" y="178" width="52" height="130" rx="2" fill="none" stroke="#2a333d" stroke-width="5"/>
        <rect x="616" y="326" width="52" height="168" rx="2" fill="none" stroke="#2a333d" stroke-width="5"/>
        <rect x="682" y="326" width="52" height="168" rx="2" fill="none" stroke="#2a333d" stroke-width="5"/>
        <path d="M618 180 v124 M684 180 v124 M618 328 v162 M684 328 v162" stroke="#56636f" stroke-width="1.5"/>
        ${heights}
        <rect x="724" y="340" width="12" height="34" rx="3" fill="#8a8a82"/>
        <circle cx="730" cy="350" r="7" fill="#e3dccd"/><circle cx="728" cy="348" r="2" fill="#fff" opacity="0.7"/>
        <path d="M727 360 h6 l-1 10 h-4z" fill="#141a20"/>
        <rect class="door-gap" x="602" y="515" width="146" height="6" fill="#b3f28a" opacity="0.15"/>
        <text x="675" y="132" text-anchor="middle" font-family="UnifrakturCook, serif" font-size="26" fill="#f2a63a">Exit</text>`)}

      ${hotspot("music-box", [810, 220, 160, 300], `
        <ellipse cx="890" cy="518" rx="78" ry="6" fill="#0c0a08" opacity="0.6"/>
        <path d="M832 500 v18 M948 500 v18" stroke="#4a4750" stroke-width="7"/>
        <rect x="826" y="350" width="128" height="152" fill="#57545e"/>
        <rect x="818" y="340" width="144" height="12" rx="2" fill="#6d6a74"/>
        <rect x="818" y="340" width="144" height="2" fill="#8a8792"/>
        ${[360, 406, 452].map((y) => `<rect x="834" y="${y}" width="112" height="40" rx="2" fill="#625f6a" stroke="#3c3a43" stroke-width="2"/><circle cx="866" cy="${y + 20}" r="3.5" fill="#cfc6b4"/><circle cx="914" cy="${y + 20}" r="3.5" fill="#cfc6b4"/>`).join("")}
        <rect x="846" y="298" width="88" height="42" rx="2" fill="#7a4f5a"/>
        <rect x="846" y="298" width="88" height="42" rx="2" fill="none" stroke="#b08d3e" stroke-width="2"/>
        <path d="M852 318 h76" stroke="#b08d3e" stroke-width="1" stroke-dasharray="3 3"/>
        <path d="M848 298 L932 298 L926 258 L854 258Z" fill="#6a4450"/>
        <path d="M858 294 L922 294 L918 264 L862 264Z" fill="#2a2f3a"/>
        <path d="M866 290 L880 268 M876 290 L886 274" stroke="#c7d6e8" stroke-opacity="0.2" stroke-width="2"/>
        <path d="M934 312 h10" stroke="#b08d3e" stroke-width="3"/>
        <path d="M944 304 c6 0 6 8 0 8 c-6 0 -6 8 0 8 c6 0 6 -8 0 -8" fill="#b08d3e"/>
        <ellipse cx="890" cy="298" rx="9" ry="2.6" fill="#b08d3e"/>
        <g transform="translate(890 0)">
          <g>
            <animateTransform attributeName="transform" type="scale" values="1 1;0.15 1;-1 1;0.15 1;1 1" dur="5s" repeatCount="indefinite"/>
            <g transform="translate(-890 0)">
              <path d="M888 296 L886 278 M892 296 L896 280" stroke="#efe4dc" stroke-width="2" stroke-linecap="round"/>
              <ellipse cx="890" cy="276" rx="15" ry="4.5" fill="#e8d6dc"/>
              <path d="M886 276 C886 266 887 262 890 260 C893 262 894 266 894 276Z" fill="#d8b8c4"/>
              <path d="M887 262 C880 256 882 246 888 244 M893 262 C900 256 898 246 892 244" stroke="#efe4dc" stroke-width="1.8" fill="none" stroke-linecap="round"/>
              <circle cx="890" cy="254" r="4.2" fill="#efe4dc"/>
              <circle cx="890" cy="249.5" r="2.2" fill="#5a3a2a"/>
              <circle cx="891.5" cy="254" r="0.9" fill="#1a1416"/>
            </g>
          </g>
        </g>
        <g font-family="IM Fell English, serif" font-size="18" fill="#e6d6ad">
          <text x="912" y="268" opacity="0">♪
            <animate attributeName="opacity" values="0;0.7;0" dur="4s" repeatCount="indefinite"/>
            <animateTransform attributeName="transform" type="translate" values="0 0;14 -30" dur="4s" repeatCount="indefinite"/></text>
          <text x="862" y="262" opacity="0">♫
            <animate attributeName="opacity" values="0;0.6;0" dur="4s" begin="2s" repeatCount="indefinite"/>
            <animateTransform attributeName="transform" type="translate" values="0 0;-12 -30" dur="4s" begin="2s" repeatCount="indefinite"/></text>
        </g>
        ${plate(1, 890, 426)}`)}

      ${hotspot("wardrobe", [1005, 70, 170, 450], `
        <ellipse cx="1090" cy="518" rx="92" ry="6" fill="#0c0a08" opacity="0.6"/>
        <path d="M1016 512 v8 M1164 512 v8" stroke="#2c2527" stroke-width="10"/>
        <rect x="1012" y="92" width="156" height="414" fill="#352d30"/>
        <rect x="1004" y="74" width="172" height="22" fill="#453b3e"/>
        <rect x="1004" y="74" width="172" height="3" fill="#5e5255"/>
        <path d="M1054 74 C1062 58 1118 58 1126 74Z" fill="#453b3e"/>
        <circle cx="1090" cy="66" r="4" fill="#5e5255"/>
        <rect x="1006" y="500" width="168" height="14" fill="#2c2527"/>
        <rect x="1022" y="104" width="68" height="390" fill="#41373a" stroke="#241d1f" stroke-width="2"/>
        <rect x="1032" y="118" width="48" height="160" rx="3" fill="none" stroke="#2a2224" stroke-width="4"/>
        <rect x="1032" y="296" width="48" height="182" rx="3" fill="none" stroke="#2a2224" stroke-width="4"/>
        <path d="M1034 120 v156 M1034 298 v178" stroke="#56494d" stroke-width="1.2"/>
        <path d="M1090 104 L1110 110 L1110 488 L1090 494Z" fill="#020203"/>
        <g class="nursery-eyes">
          <animate attributeName="opacity" values="1;1;0;1;1;0;1" keyTimes="0;0.6;0.62;0.64;0.9;0.92;1" dur="7s" repeatCount="indefinite"/>
          <g filter="url(#nursery-glow)"><ellipse cx="1096" cy="250" rx="2.6" ry="2.4" fill="#b3f28a"/><ellipse cx="1104" cy="251" rx="2.6" ry="2.4" fill="#b3f28a"/></g>
          <ellipse cx="1096" cy="250" rx="1.8" ry="1.6" fill="#eaffd0"/><ellipse cx="1104" cy="251" rx="1.8" ry="1.6" fill="#eaffd0"/>
        </g>
        <path d="M1110 110 L1160 104 L1160 494 L1110 488Z" fill="#3c3235" stroke="#241d1f" stroke-width="2"/>
        <path d="M1118 124 L1152 120 L1152 278 L1118 280Z M1118 298 L1152 296 L1152 476 L1118 474Z" fill="none" stroke="#2a2224" stroke-width="4"/>
        <g fill="#cfc6b8">
          <ellipse cx="1112" cy="318" rx="4" ry="2.6"/><ellipse cx="1113" cy="325" rx="4.2" ry="2.6"/><ellipse cx="1112" cy="332" rx="3.8" ry="2.4"/>
        </g>
        <rect x="1080" y="290" width="7" height="22" rx="3" fill="#8a7a52"/>
        <rect x="1114" y="290" width="7" height="22" rx="3" fill="#8a7a52"/>
        <path d="M1083 318 h2 l1 6 h-4z" fill="#0b0809"/>
        ${plate(4, 1090, 112)}`)}

      <!-- Lights: the moon through the window, motes drifting in its beam -->
      <rect width="1200" height="700" fill="url(#nursery-moonlight)" pointer-events="none"/>
      <g fill="#dfe8ff" pointer-events="none">
        ${[[200, 380, 0], [260, 450, 2], [320, 520, 4], [240, 560, 1], [380, 600, 3]].map(([x, y, b]) => `<circle cx="${x}" cy="${y}" r="1.6" opacity="0">
          <animate attributeName="opacity" values="0;0.5;0" dur="7s" begin="${b}s" repeatCount="indefinite"/>
          <animateTransform attributeName="transform" type="translate" values="0 0;16 -40" dur="7s" begin="${b}s" repeatCount="indefinite"/></circle>`).join("")}
      </g>

      ${hotspot("rocking-horse", [40, 370, 245, 300], `
        <ellipse cx="162" cy="664" rx="118" ry="8" fill="#0c0a08" opacity="0.6"/>
        <g>
          <animateTransform attributeName="transform" type="translate" values="-11 0;11 0;-11 0" keyTimes="0;0.5;1" calcMode="spline" keySplines="0.45 0 0.55 1;0.45 0 0.55 1" dur="3.4s" repeatCount="indefinite"/>
          <g>
            <animateTransform attributeName="transform" type="rotate" values="-3 162 448;3 162 448;-3 162 448" keyTimes="0;0.5;1" calcMode="spline" keySplines="0.45 0 0.55 1;0.45 0 0.55 1" dur="3.4s" repeatCount="indefinite"/>
            <path d="M60 620 Q166 682 266 620" stroke="#3e2a1a" stroke-width="10" fill="none" stroke-linecap="round"/>
            <path d="M94 546 L82 642 M112 548 L108 652 M210 548 L214 650 M224 544 L238 642" stroke="#a89a80" stroke-width="10" stroke-linecap="round"/>
            <path d="M52 628 Q162 690 272 628" stroke="#6b4a2c" stroke-width="12" fill="none" stroke-linecap="round"/>
            <path d="M58 626 Q162 684 266 626" stroke="#8a6440" stroke-width="2.5" fill="none"/>
            <path d="M86 514 C62 520 50 552 56 592 C64 566 70 546 94 528Z" fill="#5a2424"/>
            <path d="M66 540 C60 556 60 570 62 582 M76 530 C70 548 70 566 72 576" stroke="#3e1616" stroke-width="2" fill="none"/>
            <ellipse cx="160" cy="528" rx="80" ry="30" fill="#b9ab90"/>
            <path d="M196 508 C206 470 220 440 234 414 L260 424 C252 450 242 482 238 522Z" fill="#b9ab90"/>
            <path d="M232 410 C240 390 262 386 272 400 L282 436 C284 450 272 456 264 448 L248 430Z" fill="#c4b69b"/>
            <path d="M236 404 l-3 -18 l12 11Z" fill="#a89a80"/>
            <path d="M236 400 C222 422 212 452 202 504 L194 508 C202 462 212 422 230 394Z" fill="#5a2424"/>
            <path d="M232 410 l-8 8 M226 428 l-8 6 M220 448 l-8 6 M214 468 l-8 6 M208 488 l-8 6" stroke="#5a2424" stroke-width="4" stroke-linecap="round"/>
            <g fill="#9d907a" opacity="0.7"><circle cx="122" cy="522" r="7"/><circle cx="140" cy="540" r="5"/><circle cx="196" cy="520" r="6"/><circle cx="104" cy="536" r="4"/><circle cx="214" cy="472" r="5"/><circle cx="182" cy="544" r="4"/></g>
            <circle cx="253" cy="410" r="4.2" fill="#120c08"/><circle cx="254.5" cy="408.5" r="1.3" fill="#e8eedc"/>
            <circle cx="275" cy="440" r="2" fill="#3a2a20"/>
            <path d="M246 422 L276 432 M258 400 L262 446 M262 446 Q230 470 176 500" stroke="#7a2a2e" stroke-width="2.5" fill="none"/>
            <circle cx="240" cy="420" r="4" fill="#3e2a1a"/>
            <path d="M134 502 C150 494 176 494 190 502 L186 522 C172 527 152 527 138 522Z" fill="#7a2a2e"/>
            <path d="M134 502 C150 494 176 494 190 502 M138 522 C152 527 172 527 186 522" stroke="#b08d3e" stroke-width="2" fill="none"/>
            <path d="M162 524 V550" stroke="#5a2424" stroke-width="2.5"/><path d="M156 550 h12 v6 h-12z" fill="none" stroke="#8a8a82" stroke-width="2"/>
            ${plate(0, 162, 584)}
          </g>
        </g>`)}

      ${hotspot("doll", [520, 528, 180, 160], `
        <ellipse cx="610" cy="684" rx="76" ry="6" fill="#0c0a08" opacity="0.6"/>
        <path d="M554 658 v26 M666 658 v26" stroke="#3e2a22" stroke-width="7" stroke-linecap="round"/>
        <path d="M556 604 C552 562 568 538 610 536 C652 538 668 562 664 604Z" fill="#6e4a52" stroke="#3e2a30" stroke-width="2"/>
        <g fill="#4e323a"><circle cx="590" cy="560" r="2"/><circle cx="630" cy="560" r="2"/><circle cx="610" cy="552" r="2"/><circle cx="580" cy="584" r="2"/><circle cx="640" cy="584" r="2"/></g>
        <path d="M546 604 C540 588 556 580 568 592 L568 634 H548Z" fill="#7a5560" stroke="#3e2a30" stroke-width="1.5"/>
        <path d="M674 604 C680 588 664 580 652 592 L652 634 H672Z" fill="#7a5560" stroke="#3e2a30" stroke-width="1.5"/>
        <path d="M562 612 H658 L668 634 H552Z" fill="#82606a"/>
        <rect x="546" y="632" width="128" height="28" fill="#5d3d45"/>
        <path d="M546 660 h128" stroke="#b08d3e" stroke-width="3" stroke-dasharray="2 3"/>

        <path d="M598 590 C590 600 584 612 578 630 H642 C636 612 630 600 622 590Z" fill="#c4adab"/>
        <path d="M578 630 q5 -6 10 0 q5 -6 10 0 q5 -6 10 0 q5 -6 10 0 q5 -6 10 0 q5 -6 10 0" stroke="#e3d8cf" stroke-width="2.5" fill="none"/>
        <path d="M592 588 C600 596 620 596 628 588 L624 584 C616 590 604 590 596 584Z" fill="#e3d8cf"/>
        <path d="M594 592 C586 602 584 612 584 622 M626 592 C634 602 636 612 636 622" stroke="#c4adab" stroke-width="8" stroke-linecap="round" fill="none"/>
        <circle cx="584" cy="626" r="4" fill="#e9e0d4"/><circle cx="636" cy="626" r="4" fill="#e9e0d4"/>
        <ellipse cx="599" cy="626" rx="7" ry="4" fill="#1a1416"/><ellipse cx="621" cy="626" rx="7" ry="4" fill="#1a1416"/>

        <g class="nursery-doll-head">
          <rect x="605" y="580" width="10" height="10" fill="#e9e0d4"/>
          <circle cx="610" cy="566" r="19" fill="#e9e0d4"/>
          <path d="M590 568 C586 540 634 540 630 568 C626 552 594 552 590 568Z" fill="#3a2418"/>
          <g fill="#3a2418"><ellipse cx="589" cy="576" rx="4.5" ry="7"/><ellipse cx="587" cy="590" rx="4" ry="6"/><ellipse cx="631" cy="576" rx="4.5" ry="7"/><ellipse cx="633" cy="590" rx="4" ry="6"/></g>
          <path d="M618 548 l12 -8 l2 12Z M618 548 l-6 -10 l12 2Z" fill="#8f5a66"/>
          <ellipse cx="603" cy="568" rx="3.6" ry="4.2" fill="#1e2430"/><circle cx="604" cy="566.5" r="1.1" fill="#fff"/>
          <ellipse cx="617" cy="568" rx="3.6" ry="4.2" fill="#1e2430"/><circle cx="618" cy="566.5" r="1.1" fill="#fff"/>
          <path d="M613 563.5 a4 4 0 0 1 8 0 v3 h-8Z" fill="#ddd2c4"/>
          <circle cx="598" cy="576" r="3.5" fill="#d49a9a" opacity="0.45"/><circle cx="622" cy="576" r="3.5" fill="#d49a9a" opacity="0.45"/>
          <path d="M607 578 q3 2 6 0 q-3 3 -6 0Z" fill="#8f3a44"/>
          <path d="M614 548 L609 556 L614 562 L608 574 M609 556 l-5 -2" stroke="#4a3a38" stroke-width="1" fill="none"/>
        </g>
        ${plate(2, 610, 646)}`)}

      ${block(872, 626, "A", "#7a4444", -4)}
      ${block(914, 640, "G", "#45587a")}
      ${block(958, 628, "R", "#4c6448", 3)}
      ${block(1004, 646, "E", "#7f7038", 22)}
      ${block(1052, 632, "E", "#7a4444", -6)}
      ${block(920, 598, "I", "#6a4a6e", -8)}

      <rect width="1200" height="700" fill="url(#nursery-vignette)" pointer-events="none"/>
    `;
  },

  // The doll's head slowly turns to follow the cursor; the horse rocks and the
  // ballerina spins on their own (paused for reduced motion).
  mount(svg) {
    const head = svg.querySelector(".nursery-doll-head");
    if (head) Object.assign(head.style, { transformOrigin: "610px 586px", transition: "transform 1.6s ease-in-out" });
    const stopFollowing = followPointer(svg, ({ x, y }) => {
      const angle = Math.max(-14, Math.min(14, ((x - 610) / 500) * 14));
      const nod = Math.max(-4, Math.min(4, ((y - 566) / 300) * 4));
      if (head) head.style.transform = `rotate(${(angle + nod * Math.sign(angle || 1)).toFixed(1)}deg)`;
    });
    return combine(stopFollowing, calmWhenReduced(svg));
  },
};
