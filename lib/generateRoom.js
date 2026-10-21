// Turns terms & conditions text into an escape room, using Claude.

import Anthropic from "@anthropic-ai/sdk";
import { UserError } from "./errors.js";

const MODEL = "claude-opus-5-5";
export const OBJECTS = ["portrait", "clock", "bookshelf", "desk", "safe"];
const MIN_CHARS = 800;
const MAX_CHARS = 400_000;

// Created on first use, so the demo room still works without credentials.
let client;

const SYSTEM = `You design puzzles for "Terms of Dread", a Halloween escape room game. The player is trapped in a haunted solicitor's office, and the only way out is to read the fine print of a real website's terms & conditions.

You will receive the full terms text. Build exactly five puzzles, one for each object in the room: the portrait, the grandfather clock, the bookshelf, the desk, and the safe. Each object has a different puzzle.

Rules for every puzzle:
- It must be answerable only by reading a specific passage of the terms. Prefer the clauses an ordinary user would be most surprised by: data sharing, arbitration and class-action waivers, auto-renewal, content licences, account termination, liability caps, notice periods, age limits, governing law.
- "quote" is copied verbatim from the terms, character for character, 1 to 4 sentences. Do not paraphrase or fix typos inside the quote. The answer must be findable in the quote.
- "kind" is "number" (answer is digits only, e.g. "30"), "word" (a single word or short phrase of at most three words), or "choice" (exactly four options; the answer is one of them, copied exactly). Use at least one of each kind.
- For "number" and "word", put sensible alternative spellings in "accepted" (e.g. "thirty", "30 days"). For "choice", leave "accepted" empty.
- "riddle" is 1-2 sentences of eerie, playful flavour text that the object speaks or displays. "question" is the plain, unambiguous question the player answers.
- "plain_english" says in one or two sentences what this clause really means for a user. Be accurate and fair; do not exaggerate.
- "hints" are two hints, the first gentle (which section to look in), the second nearly giving it away.
- "clause_ref" is the section number or heading the quote comes from, as written in the terms, or a short description if there is none.

Also write:
- "company": the name of the company or service the terms belong to.
- "intro": 2-3 sentences setting the scene, mentioning the company. Spooky but witty, never gory.
- "verdict": 3-5 short bullet sentences summarising the most important things a user agrees to under these terms.

If the text is not terms & conditions, a privacy policy, or a similar legal agreement, set "is_terms" to false and fill the other fields with empty values.`;

const puzzleSchema = {
  type: "object",
  additionalProperties: false,
  required: ["object", "title", "riddle", "question", "kind", "answer", "accepted", "options", "quote", "clause_ref", "plain_english", "hints"],
  properties: {
    object: { type: "string", enum: OBJECTS },
    title: { type: "string" },
    riddle: { type: "string" },
    question: { type: "string" },
    kind: { type: "string", enum: ["number", "word", "choice"] },
    answer: { type: "string" },
    accepted: { type: "array", items: { type: "string" } },
    options: { type: "array", items: { type: "string" } },
    quote: { type: "string" },
    clause_ref: { type: "string" },
    plain_english: { type: "string" },
    hints: { type: "array", items: { type: "string" } },
  },
};

const roomSchema = {
  type: "object",
  additionalProperties: false,
  required: ["is_terms", "company", "intro", "puzzles", "verdict"],
  properties: {
    is_terms: { type: "boolean" },
    company: { type: "string" },
    intro: { type: "string" },
    puzzles: { type: "array", items: puzzleSchema },
    verdict: { type: "array", items: { type: "string" } },
  },
};

const squash = (s) => s.replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/\s+/g, " ").trim().toLowerCase();

function validate(room, sourceText) {
  if (!room.is_terms) {
    throw new UserError("That doesn't look like terms & conditions. Try the site's terms, privacy policy or user agreement.");
  }
  const byObject = new Map(room.puzzles.map((p) => [p.object, p]));
  const source = squash(sourceText);

  const puzzles = OBJECTS.map((object) => {
    const p = byObject.get(object);
    if (!p) throw new UserError("The spirits only built part of the room. Try generating again.");
    if (p.kind === "choice" && (p.options.length < 2 || !p.options.includes(p.answer))) {
      throw new UserError("One of the generated puzzles was broken. Try generating again.");
    }
    return {
      ...p,
      options: p.kind === "choice" ? p.options : [],
      hints: p.hints.slice(0, 2),
      // Flag quotes the model may have paraphrased, so the game can say so.
      verified: source.includes(squash(p.quote)),
      // Each solved object reveals one digit of the door code.
      digit: String(Math.floor(Math.random() * 10)),
    };
  });

  return {
    company: room.company,
    intro: room.intro,
    verdict: room.verdict,
    puzzles,
    doorCode: puzzles.map((p) => p.digit).join(""),
    termsText: sourceText,
  };
}

export async function generateRoom(termsText) {
  const text = termsText.trim();
  if (text.length < MIN_CHARS) {
    throw new UserError("That's too short to be a full set of terms. Paste the whole page, or try a link.");
  }
  if (text.length > MAX_CHARS) {
    throw new UserError(`That's ${text.length.toLocaleString()} characters, more than the ${MAX_CHARS.toLocaleString()} this game reads. Paste just the main terms section.`);
  }

  client ??= new Anthropic();
  const response = await client.beta.messages.create({
    model: MODEL,
    max_tokens: 16000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    thinking: { type: "adaptive" },
    output_config: {
      effort: "medium",
      format: { type: "json_schema", schema: roomSchema },
    },
    system: SYSTEM,
    messages: [
      {
        role: "user",
        content: `<terms>\n${text}\n</terms>\n\nBuild the escape room from these terms.`,
      },
    ],
  });

  if (response.stop_reason === "refusal") {
    throw new UserError("Claude declined to build a room from this text. Try a different site's terms.");
  }
  if (response.stop_reason === "max_tokens") {
    throw new UserError("The room came out too long and was cut off. Try generating again.");
  }

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock) throw new UserError("Claude returned no room. Try generating again.");
  return validate(JSON.parse(textBlock.text), text);
}
