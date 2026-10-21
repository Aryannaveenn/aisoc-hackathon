// Small helpers shared by the room themes' ambient behaviours.

const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");

export const prefersCalm = () => reducedMotion.matches;

// Pauses the room's SVG animations (<animate>, <animateTransform>…) while the
// player prefers reduced motion. The #room <svg> is reused by every theme, so
// the cleanup always resumes them.
export function calmWhenReduced(svg) {
  const apply = () => (reducedMotion.matches ? svg.pauseAnimations?.() : svg.unpauseAnimations?.());
  apply();
  reducedMotion.addEventListener("change", apply);
  return () => {
    reducedMotion.removeEventListener("change", apply);
    svg.unpauseAnimations?.();
  };
}

// Calls fn({ x, y }) in the room's 1200×700 viewBox coordinates as the pointer moves.
export function followPointer(svg, fn) {
  const move = (e) => {
    const rect = svg.getBoundingClientRect();
    if (!rect.width) return;
    fn({ x: ((e.clientX - rect.left) / rect.width) * 1200, y: ((e.clientY - rect.top) / rect.height) * 700 });
  };
  document.addEventListener("pointermove", move);
  return () => document.removeEventListener("pointermove", move);
}

// Runs every cleanup returned by a theme's ambient pieces.
export const combine = (...cleanups) => () => cleanups.forEach((fn) => fn?.());

// A candle flame that gutters, centred on its base (x, y).
export function flame(x, y, { size = 1, dur = 1.3, glow = null } = {}) {
  const s = size;
  const tall = `M${x} ${y - 20 * s} C${x - 6 * s} ${y - 10 * s} ${x - 6 * s} ${y - 3 * s} ${x} ${y} C${x + 6 * s} ${y - 3 * s} ${x + 6 * s} ${y - 10 * s} ${x} ${y - 20 * s}Z`;
  const lean = `M${x - 1.5 * s} ${y - 23 * s} C${x - 7 * s} ${y - 11 * s} ${x - 5 * s} ${y - 3 * s} ${x} ${y} C${x + 5 * s} ${y - 3 * s} ${x + 7 * s} ${y - 11 * s} ${x - 1.5 * s} ${y - 23 * s}Z`;
  const low = `M${x + 1 * s} ${y - 17 * s} C${x - 6 * s} ${y - 9 * s} ${x - 6 * s} ${y - 3 * s} ${x} ${y} C${x + 6 * s} ${y - 3 * s} ${x + 6 * s} ${y - 9 * s} ${x + 1 * s} ${y - 17 * s}Z`;
  return `
    ${glow ? `<circle cx="${x}" cy="${y - 10 * s}" r="${30 * s}" fill="url(#${glow})"><animate attributeName="r" values="${30 * s};${33 * s};${28 * s};${30 * s}" dur="${dur * 1.7}s" repeatCount="indefinite"/></circle>` : ""}
    <path d="${tall}" fill="#f2a63a"><animate attributeName="d" dur="${dur}s" repeatCount="indefinite" values="${tall};${lean};${low};${tall}"/></path>
    <ellipse cx="${x}" cy="${y - 5 * s}" rx="${2.4 * s}" ry="${5 * s}" fill="#ffe7b0"/>
    <line x1="${x}" y1="${y}" x2="${x}" y2="${y + 3 * s}" stroke="#120c08" stroke-width="${1.5 * s}"/>`;
}
