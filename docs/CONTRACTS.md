# Contracts

The shared shapes that the core game, the server and each feature module agree on. If you need something that isn't here, add it to your own files rather than changing someone else's.

## File ownership

| Area | Files |
|---|---|
| Core (don't edit) | `public/game.js`, `public/js/api.js`, `public/style.css`, `public/index.html` (except where noted), `server.js`, `lib/http.js`, `lib/errors.js`, `lib/themes.js` |
| Rooms | `public/js/rooms/*`, `public/css/rooms.css` |
| Generation (server) | `lib/generateRoom.js`, `lib/fetchTerms.js`, `lib/roomStore.js` (may extend, keep signatures), `routes/rooms.js`, `scripts/*`, `data/prebuilt/*`, `package.json` scripts |
| Title, loading and dread UI | `public/js/features/summon.js`, `presets.js`, `dread.js`; `public/css/summon.css`, `presets.css`, `dread.css`; the inside of `<main id="screen-loading">` in `index.html` |
| Ghost and share | `routes/ghost.js`, `lib/ghost.js`, `public/js/features/ghost.js`, `share.js`; `public/css/ghost.css`, `share.css` |
| Twist and haunting | `public/js/features/twist.js`, `haunting.js`; `public/css/twist.css`, `haunting.css`; new files under `public/assets/haunting/` |

## Room JSON

What `GET /api/room/:id` returns and `api.startGame(room)` takes. Puzzles are in lock order: `puzzles[i]` belongs to `theme.objects[i]`.

```jsonc
{
  "id": "spotify-3fa9c1",          // [a-z0-9-]; "demo" is the built-in demo room
  "theme": "crypt",                 // a key of lib/themes.js THEMES
  "company": "Spotify",
  "sourceUrl": "https://…" | null,
  "preset": true,                   // pre-built room from data/prebuilt
  "createdAt": "2026-10-21T…",
  "intro": "2–3 sentences",
  "verdict": ["what you agreed to", "…"],
  "termsText": "the full terms",
  "doorCode": "40371",              // puzzles' digits joined in order
  "puzzles": [                      // exactly 5
    {
      "object": "coffin",           // theme object id
      "topic": "Inactive accounts", // 2–4 word label for the clause
      "title": "…", "riddle": "…", "question": "…",
      "kind": "number" | "word" | "choice",
      "answer": "…", "accepted": ["…"], "options": ["…"],   // options only for choice
      "quote": "verbatim from the terms", "clause_ref": "8.2",
      "plain_english": "…",
      "verified": true,             // quote found verbatim in termsText
      "digit": "4"
    }
  ],
  "dread": {                        // how nasty the terms are
    "score": 0-100,
    "label": "Quietly sinister",    // short, spooky, sentence case
    "reasons": [{ "category": "Disputes", "severity": 1-3, "summary": "one sentence" }]
  },
  "twist": {                        // the "we've updated our terms" event
    "clause_ref": "9.1",
    "original": "an exact substring of termsText, so termsText.replace(original, altered) works",
    "altered": "the sneakier replacement sentence",
    "question": "…", "options": ["…", "…", "…", "…"], "answer": "one of options",
    "plain_english": "…"
  }
}
```

`dread` and `twist` can be missing on old rooms; features must cope. The core gives 5 hearts below a score of 40, 4 hearts from 40, and 3 from 70.

## HTTP API

- `GET /api/rooms` returns `{ rooms: [{ id, company, theme, sourceUrl, dread: { score, label } | null, preset, createdAt }] }`, sorted by dread score, highest first.
- `GET /api/room/:id` returns the full room JSON, or 404 `{ error }`. `demo` works.
- `POST /api/room` with `{ url }` or `{ text }` (plus an optional `theme` id) streams **NDJSON** (`Content-Type: application/x-ndjson`), one JSON object per line:
  - `{ "type": "status", "message": "Fetching the terms…" }`
  - `{ "type": "clause", "ref": "8.2", "title": "short label", "quote": "verbatim excerpt" }`, sent as each puzzle's clause is found
  - `{ "type": "room", "room": { …full room JSON, already saved… } }`, always the last line on success
  - `{ "type": "error", "error": "message to show the player" }`, the last line on failure
  - Validation errors before streaming starts may still come back as a plain JSON `{ error }` with a 4xx status.
- `POST /api/ghost` with `{ roomId, question, history: [{ role: "user" | "assistant", content }] }` returns `{ answer }`, or `{ error }` with a 4xx/5xx status. Rooms are loaded with `getRoom(roomId)` from `lib/roomStore.js`.

All errors are `{ error: "a sentence the player can read" }`; use `sendError`/`errorBody` from `lib/http.js`.

## Client api (`public/js/api.js`)

```js
import { api, on, emit } from "../api.js";
```

Feature modules load before `game.js` finishes, so only call `api.*` inside event handlers or after `core:ready`.

| Method | Does |
|---|---|
| `api.startGame(room)` | Builds the room and shows the game screen |
| `api.showScreen(id)` | `"screen-title"`, `"screen-loading"` or `"screen-game"` |
| `api.getState()` | `{ room, theme, maxHearts, hearts, solved: Set<objectId>, over, scaring, startedAt, sound }` (read only) |
| `api.getTheme()` | The current client theme module |
| `api.elapsed()` | `"m:ss"` since the game started |
| `api.loseHeart(cause)` | Costs a heart with the escalating jumpscare; ends the game at 0. Returns a promise |
| `api.jumpscare(level)` | Just the scare, levels 1–5, no heart lost |
| `api.toast(message, { duration })` | A short notice at the bottom of the screen |
| `api.flickerLights(ms)` | Flickers the game screen |
| `api.getAudio()` | `{ ctx, out, scareBus }` or `null`. Connect to `out` so the mute button works; `scareBus` is the jumpscare amp |
| `api.unlockAudio()` | Call from a user gesture before sound |
| `api.setTermsText(text, { highlight })` | Replaces the room's terms text and refreshes the reader; `highlight` (a substring) is marked when there's no search |
| `api.addDoorGuard(fn)` | `fn()` returns `null`, or a sentence explaining why the door won't open yet. Returns a remover. Guards persist across games, so check your own state |
| `api.escapeHtml(s)` | |

### Events (`on(type, fn)`)

| Event | Detail |
|---|---|
| `core:ready` | |
| `screen:show` | `{ screen }` |
| `game:start` | `{ room, theme, maxHearts }` |
| `puzzle:open` | `{ index, object, solved }` |
| `puzzle:solved` | `{ index, object, solvedCount }` |
| `answer:wrong` | `{ index, object }` (`object` is `"door"` for the door code) |
| `heart:lost` | `{ hearts, maxHearts, cause }` |
| `scare:start` / `scare:end` | `{ level }` |
| `sound:toggle` | `{ on }` |
| `ghost:summon` | `{ question }`: a lock's "Ask the ghost" button; opens the ghost with the question typed in |
| `game:end` | `{ won, room, theme, hearts, maxHearts, time, seconds }`. `#ending-extras` is emptied just before this fires |

### Mount points in `index.html`

- `#title-extras`: inside the title card, below the summon form
- `#hud-extras`: the game HUD, before the timer
- `#room-overlay`: absolutely positioned over the room SVG. It has `pointer-events: none`; direct children get `auto`
- `#ending-extras`: in the ending dialog, below the verdict list
- `#toast`: used by `api.toast`

Build your own dialogs with `<dialog>` and `showModal()`, styled like `.sheet` (parchment).

## Room themes (`public/js/rooms/<id>.js`)

```js
export default {
  id: "crypt",                         // matches lib/themes.js
  name: "The family crypt",
  exitName: "The iron gate",
  objects: [{ id: "coffin", name: "The coffin" }, …],   // 5, same ids and order as lib/themes.js
  render({ hotspot, plate, door }) {   // returns the inner SVG markup for a 1200×700 viewBox
    // hotspot(objectId, [x, y, w, h], artSvg): a clickable object. Include plate(index, x, y)
    //   in the art: the brass Roman-numeral plate that shows the digit once solved.
    // door([x, y, w, h], artSvg): the exit. Give one element class="door-gap"; it glows once every lock is open.
  },
  mount(svgElement) { return cleanupFn },  // optional: ambient behaviour, like the office portrait's eyes
};
```

Prefix every SVG `id` (gradients, patterns, filters) with the theme id so rooms never clash.
