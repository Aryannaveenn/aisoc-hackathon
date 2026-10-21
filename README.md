# Terms of Dread

A Halloween escape room built from a website's terms and conditions. Paste a link to any site's T&Cs and Claude turns its real clauses into five locks in a haunted room: a solicitor's office, a family crypt, a séance parlour or a nursery, picked at random. Read the fine print to open each lock, collect the digits of the door code, and escape.

Claude also scores how nasty the terms are (the *dread* score), and nastier terms give you fewer hearts: 5, 4 or 3. Every wrong answer triggers a jumpscare and costs a heart, and each scare is worse than the last. Lose them all and you're bound by the terms forever.

While you play:
- **Ask the ghost** questions about the terms (3 per game). It answers from the real text but won't give away the locks.
- Partway through, **"We've updated our terms"**: a clause quietly changes, and you have to spot what changed before the door will open.
- Random **hauntings** (whispers, a shadow crossing the room, knocking, handprints) keep you on edge without costing hearts.
- At the end you get a **share card** and a challenge link (`/?room=<id>`) so friends can play the same room.

The title screen has one-click rooms for famous sites and a "Most cursed terms" leaderboard.

## Run it

```bash
npm install
npm start          # http://localhost:3000
```

To generate new rooms, put your key in `.env` (it's gitignored):

```
ANTHROPIC_API_KEY=sk-ant-...
```

**Play the demo room** and the pre-built famous-site rooms work without an API key. The demo uses the terms of a made-up storage service, Hollowmere Cloud.

To rebuild the famous-site rooms (8 Claude calls): `npm run rooms:prebuild` (add `--force` to overwrite, or pass ids like `spotify` to build just those).

## How it works

- `server.js` mounts two routers. `routes/rooms.js` handles `POST /api/room` (streams NDJSON as Claude finds clauses), `GET /api/room/:id` and `GET /api/rooms`. `routes/ghost.js` handles `POST /api/ghost`.
- `lib/generateRoom.js` sends the full terms to Claude (`claude-opus-5-5`, streamed structured JSON) with the room's five objects, and gets back the puzzles, the dread score and the twist. Every quote and the twist's original sentence are checked against the source text.
- `lib/roomStore.js` saves rooms: `data/prebuilt/` (committed) and `data/generated/` (gitignored).
- `public/game.js` is the core game. Rooms are plugins in `public/js/rooms/`, and features are modules in `public/js/features/` that talk to the core through the event bus in `public/js/api.js`. `docs/CONTRACTS.md` describes every shape and event.
- Jumpscares use public-domain horror film stills and 1920s spirit photographs, plus CC0 screams (`public/assets/CREDITS.md`, `public/assets/haunting/CREDITS.md`). Every scare runs through a Web Audio "amp" (boost, brick-wall limiter, soft clipper) that holds the sound just under the digital ceiling. The music, heartbeat and orchestra hits are synthesised in the browser.

## Notes

- Some sites block bots or render their terms with JavaScript. If a link fails, paste the text instead.
- The game shows a warning for loud sounds and flashing images. If the player's system has *reduce motion* turned on, the scares skip the shake, jitter and flashes.
- Answers are checked in the browser, so anyone who opens dev tools can cheat.
- The server will fetch any URL it's given, so don't expose it publicly as-is.
