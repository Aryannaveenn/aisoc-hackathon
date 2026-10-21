// Room themes. The server picks a theme id when it builds a room (lib/themes.js),
// and each id here must match one there, with the same object ids in order.

import office from "./office.js";
import crypt from "./crypt.js";
import parlour from "./parlour.js";
import nursery from "./nursery.js";

const THEMES = [office, crypt, parlour, nursery];

const byId = new Map(THEMES.map((t) => [t.id, t]));

export function getTheme(id) {
  return byId.get(id) ?? office;
}

export function themeIds() {
  return [...byId.keys()];
}
