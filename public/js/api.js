// The seam between the core game (public/game.js) and feature modules.
// See docs/CONTRACTS.md for every event and api method.

const bus = new EventTarget();

export function emit(type, detail = {}) {
  bus.dispatchEvent(new CustomEvent(type, { detail }));
}

export function on(type, fn) {
  const handler = (e) => fn(e.detail);
  bus.addEventListener(type, handler);
  return () => bus.removeEventListener(type, handler);
}

// Filled in by game.js when it loads. Feature modules are evaluated first, so
// only call these from event handlers or after the "core:ready" event.
export const api = {};
