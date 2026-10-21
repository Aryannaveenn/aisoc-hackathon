# Terms of Dread

A Halloween escape room built from a website's terms and conditions. Paste a link to any site's T&Cs and Claude turns its real clauses into five locks in a haunted solicitor's office. Read the fine print to open each lock, collect the digits of the door code, and escape.

You start with five hearts. Every wrong answer (or wrong door code) triggers a jumpscare and costs a heart, and each scare is worse than the last. Lose all five and you're bound by the terms forever.

## Run it

```bash
npm install
npm start          # http://localhost:3000
```

To generate new rooms, put your key in `.env` (it's gitignored):

```
ANTHROPIC_API_KEY=sk-ant-...
```

**Play the demo room** works without an API key. It uses the terms of a made-up storage service, Hollowmere Cloud.

## How it works

- `server.js`: an Express server with a single endpoint, `POST /api/room`, that takes `{ url }` or `{ text }`.
- `lib/fetchTerms.js`: fetches the page server-side (browsers block cross-site requests) and strips it to plain text.
- `lib/generateRoom.js`: sends the full terms to Claude (`claude-opus-5-5`, structured JSON output) and asks for five puzzles, one per object. Each puzzle is grounded in a verbatim quote. The server checks every quote against the source text and marks any that were paraphrased, then assigns the hidden door-code digits.
- `public/`: a plain HTML/CSS/JS client with no build step. It draws the room as SVG, synthesises the screams with the Web Audio API, and holds the game state.

## Notes

- Some sites block bots or render their terms with JavaScript. If a link fails, paste the text instead.
- Answers are checked in the browser, so anyone who opens dev tools can cheat.
- The server will fetch any URL it's given, so don't expose it publicly as-is.
