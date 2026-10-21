// The solicitor's office: the original room.

import { calmWhenReduced, combine } from "./ambient.js";

export default {
  id: "office",
  name: "The solicitor's office",
  exitName: "The exit door",
  objects: [
    { id: "portrait", name: "The portrait" },
    { id: "clock", name: "The grandfather clock" },
    { id: "bookshelf", name: "The bookshelf" },
    { id: "desk", name: "The desk" },
    { id: "safe", name: "The safe" },
  ],

  render({ hotspot, plate, door }) {
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

    return `
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

      ${hotspot("portrait", [78, 96, 168, 214], `
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

      ${hotspot("clock", [716, 128, 98, 392], `
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

      ${hotspot("bookshelf", [862, 96, 248, 424], `
        <rect x="862" y="96" width="248" height="424" fill="#2a1a0e" stroke="#120a05" stroke-width="4"/>
        ${[205, 305, 405, 505].map((y) => `<rect x="870" y="${y}" width="232" height="10" fill="#3d2614"/>`).join("")}
        ${books.join("")}
        <circle cx="1060" cy="190" r="12" fill="#d8d2bd"/><circle cx="1056" cy="188" r="2.5" fill="#000"/><circle cx="1064" cy="188" r="2.5" fill="#000"/>
        <path d="M1100 104 L1060 104 M1100 104 L1100 140 M1100 104 L1072 132" stroke="#9aa596" stroke-opacity="0.5"/>
        ${plate(2, 986, 70)}`)}

      <!-- The exit door -->
      ${door([478, 168, 184, 354], `
        <rect x="478" y="168" width="184" height="352" fill="#2a180c"/>
        <rect x="490" y="180" width="160" height="340" fill="#4a2c16" stroke="#1d1007" stroke-width="3"/>
        <rect x="506" y="198" width="128" height="120" fill="none" stroke="#2a180c" stroke-width="4"/>
        <rect x="506" y="338" width="128" height="160" fill="none" stroke="#2a180c" stroke-width="4"/>
        <circle cx="626" cy="350" r="9" fill="#b08d3e"/>
        <path d="M622 366 h8 l-2 14 h-4z" fill="#0b0604"/>
        <rect class="door-gap" x="490" y="514" width="160" height="6" fill="#b3f28a" opacity="0.15"/>
        <text x="570" y="150" text-anchor="middle" font-family="UnifrakturCook, serif" font-size="26" fill="#f2a63a">Exit</text>`)}

      <rect width="1200" height="700" fill="url(#candlelight)" pointer-events="none"/>

      ${hotspot("desk", [52, 430, 380, 230], `
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

      ${hotspot("safe", [930, 548, 170, 136], `
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
  },

  // The portrait's eyes follow the cursor around the room.
  mount(svg) {
    const eyes = svg.querySelector(".portrait-eyes");
    const follow = (e) => {
      const rect = svg.getBoundingClientRect();
      const ex = rect.left + (162 / 1200) * rect.width;
      const ey = rect.top + (182 / 700) * rect.height;
      const angle = Math.atan2(e.clientY - ey, e.clientX - ex);
      eyes?.setAttribute("transform", `translate(${Math.cos(angle) * 4} ${Math.sin(angle) * 3})`);
    };
    document.addEventListener("pointermove", follow);
    return combine(() => document.removeEventListener("pointermove", follow), calmWhenReduced(svg));
  },
};
