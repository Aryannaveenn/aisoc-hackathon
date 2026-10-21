// Turns terms & conditions text into an escape room, using Claude.
//
// generateRoom(termsText, options) streams Claude's answer, so callers can show
// progress: onClause fires as each puzzle's clause appears in the output.

import Anthropic from "@anthropic-ai/sdk";
import { UserError } from "./errors.js";
import { THEMES, randomThemeId } from "./themes.js";

const MODEL = "claude-opus-5-5";
// The office's objects, kept for older callers. Each theme has its own (lib/themes.js).
export const OBJECTS = THEMES.office.objects.map((o) => o.id);
export const MIN_CHARS = 800;
export const MAX_CHARS = 400_000;

// Created on first use, so the demo room still works without credentials.
let client;

const SYSTEM = `You design puzzles for "Terms of Dread", a Halloween escape room game. The player is trapped in a haunted room, and the only way out is to read the fine print of a real website's terms & conditions. The room has five objects, each holding one lock; the user message tells you the room and its objects.

You will receive the full terms text. Build exactly five puzzles, one for each object, in the order the objects are listed. Each object has a different puzzle about a different clause.

Rules for every puzzle:
- It must be answerable only by reading a specific passage of the terms. Prefer the clauses an ordinary user would be most surprised by: data sharing, arbitration and class-action waivers, auto-renewal, content licences, account termination, liability caps, notice periods, age limits, governing law.
- "object" is the id of the object the puzzle belongs to.
- "topic" is a 2-4 word label for what the clause is about, in sentence case, e.g. "Class-action waiver".
- "clause_ref" is where the quote comes from, kept short: the section number as written in the terms (e.g. "8.2"), or if there is no number, the section heading in at most six words.
- "quote" is copied verbatim from the terms, character for character, 1 to 4 sentences. Do not paraphrase, shorten with ellipses, or fix typos inside the quote. The answer must be findable in the quote.
- "kind" is "number" (answer is digits only, e.g. "30"), "word" (a single word or short phrase of at most three words), or "choice" (exactly four options; the answer is one of them, copied exactly). Use at least one of each kind.
- For "number" and "word", put sensible alternative spellings in "accepted" (e.g. "thirty", "30 days"). For "choice", leave "accepted" empty.
- "title" is a short, eerie name for the puzzle that fits its object.
- "riddle" is 1-2 sentences of eerie, playful flavour text that the object speaks or displays. Make it fit that object and what it looks like, and hint at the clause's subject.
- "question" is the plain, unambiguous question the player answers.
- "plain_english" says in one or two sentences what this clause really means for a user. Be accurate and fair; do not exaggerate.

The twist: halfway through the game the room announces "we've updated our terms" and one sentence of the terms changes. Pick one clause that no puzzle uses (a different section from all five quotes) where a quiet change would matter to a user, such as notice of changes, cancellation, refunds, data use, content licences or termination.
- "original" is exactly one sentence copied verbatim from the terms, character for character.
- "altered" is a plausible, sneakier rewrite of that sentence in the same style and of similar length, that changes one thing that matters (a shorter notice period, a broader licence, a removed right, a new fee). It must read like real legal drafting, not a joke.
- "question" asks what the updated sentence now says. "options" are exactly four short answers: the altered meaning (the correct "answer", copied exactly), the original meaning, and two other plausible readings.
- "plain_english" explains in one or two sentences why a change like this matters.

The dread score rates how much these terms work against an ordinary user, judged only on what this text actually says, not on the company's reputation. Be consistent across companies:
- 0-29: genuinely benign. Plain language, no forced arbitration, little or no data sharing, easy cancellation, fair liability.
- 30-49: ordinary fine print. Standard liability caps and disclaimers, a conventional content licence, the right to change terms with notice.
- 50-69: quietly sinister. Typical big-tech terms: binding arbitration or a class-action waiver, broad data sharing with partners or advertisers, auto-renewal, termination at the company's discretion.
- 70-84: dreadful. Several severe terms at once, such as arbitration plus a class-action waiver plus a perpetual, irrevocable licence to your content plus very low liability caps.
- 85-100: reserved for predatory terms: selling personal data, claiming ownership of your content, hidden fees, waiving rights most laws protect.
A typical big-tech terms of service with arbitration plus broad data sharing lands around 55-75.
- "reasons" are 3-6 findings, worst first. "category" is a short name such as "Disputes", "Data sharing", "Your content", "Auto-renewal", "Termination", "Liability", "Changes to terms", "Payments" or "Age". "severity" is 1 (mild), 2 (notable) or 3 (severe). "summary" is one plain sentence.
- "label" is a short, spooky verdict of two to five words in sentence case that matches the score and fits these particular terms, ideally nodding to their worst clause (for example "Your face, forever theirs" or "No court will hear you"). Write it fresh in your own words; general tone guides by band are "Mostly harmless", "Faintly haunted", "Quietly sinister", "Deeply cursed" and "Abandon all hope", but don't just reuse those.

Also write:
- "company": the short brand name users know the service by, such as "Spotify" or "Apple Media Services", not the legal entity.
- "intro": 2-3 sentences setting the scene in this room, mentioning the company. Spooky but witty, never gory.
- "verdict": 3-5 short bullet sentences summarising the most important things a user agrees to under these terms.

If the text is not terms & conditions, a privacy policy, or a similar legal agreement, set "is_terms" to false and fill the other fields with empty values.`;

const str = { type: "string" };
const strings = { type: "array", items: str };

function roomSchema(objectIds) {
  // Property order matters: Claude writes fields in this order, so each puzzle's
  // clause (topic, clause_ref, quote) streams out before the rest of the puzzle.
  const puzzle = {
    type: "object",
    additionalProperties: false,
    required: ["object", "topic", "clause_ref", "quote", "title", "kind", "question", "answer", "accepted", "options", "riddle", "plain_english"],
    properties: {
      object: { type: "string", enum: objectIds },
      topic: str,
      clause_ref: str,
      quote: str,
      title: str,
      kind: { type: "string", enum: ["number", "word", "choice"] },
      question: str,
      answer: str,
      accepted: strings,
      options: strings,
      riddle: str,
      plain_english: str,
    },
  };
  const twist = {
    type: "object",
    additionalProperties: false,
    required: ["clause_ref", "original", "altered", "question", "options", "answer", "plain_english"],
    properties: {
      clause_ref: str,
      original: str,
      altered: str,
      question: str,
      options: strings,
      answer: str,
      plain_english: str,
    },
  };
  const dread = {
    type: "object",
    additionalProperties: false,
    required: ["reasons", "score", "label"],
    properties: {
      reasons: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["category", "severity", "summary"],
          properties: { category: str, severity: { type: "integer" }, summary: str },
        },
      },
      score: { type: "integer" },
      label: str,
    },
  };
  return {
    type: "object",
    additionalProperties: false,
    required: ["is_terms", "company", "puzzles", "twist", "dread", "intro", "verdict"],
    properties: {
      is_terms: { type: "boolean" },
      company: str,
      puzzles: { type: "array", items: puzzle },
      twist,
      dread,
      intro: str,
      verdict: strings,
    },
  };
}

// The quote check: ignore curly quotes, whitespace and case.
const squash = (s) => s.replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/\s+/g, " ").trim().toLowerCase();

// Finds `needle` in `source` using the same comparison as squash(), and returns
// the exact text of the source that matched, or null.
export function findVerbatim(source, needle) {
  const target = squash(needle);
  if (!target) return null;
  let flat = "";
  const at = []; // at[i] = index in source of flat[i]
  let space = true;
  for (let i = 0; i < source.length; i++) {
    let ch = source[i];
    if (/\s/.test(ch)) {
      if (!space) {
        flat += " ";
        at.push(i);
      }
      space = true;
      continue;
    }
    space = false;
    ch = ch.replace(/[‘’]/, "'").replace(/[“”]/, '"').toLowerCase();
    for (const c of ch) {
      flat += c;
      at.push(i);
    }
  }
  const start = flat.indexOf(target);
  if (start === -1) return null;
  return source.slice(at[start], at[start + target.length - 1] + 1);
}

// Reads the JSON Claude is writing, a character at a time, and reports every
// completed string value with its path, e.g. ["puzzles", 2, "quote"].
export class JsonStringScanner {
  constructor(onString) {
    this.onString = onString;
    this.stack = [];
    this.inString = false;
    this.isKey = false;
    this.escape = false;
    this.unicode = null;
    this.buf = "";
  }

  push(chunk) {
    for (const ch of chunk) this.#char(ch);
  }

  #path() {
    return this.stack.map((f) => (f.type === "object" ? f.key : f.index));
  }

  #char(ch) {
    if (this.inString) {
      if (this.unicode !== null) {
        this.unicode += ch;
        if (this.unicode.length === 4) {
          this.buf += String.fromCharCode(parseInt(this.unicode, 16) || 0xfffd);
          this.unicode = null;
        }
      } else if (this.escape) {
        this.escape = false;
        if (ch === "u") this.unicode = "";
        else this.buf += { n: "\n", t: "\t", r: "\r", b: "\b", f: "\f" }[ch] ?? ch;
      } else if (ch === "\\") {
        this.escape = true;
      } else if (ch === '"') {
        this.inString = false;
        const top = this.stack.at(-1);
        if (this.isKey) top.key = this.buf;
        else this.onString(this.#path(), this.buf);
      } else {
        this.buf += ch;
      }
      return;
    }
    const top = this.stack.at(-1);
    switch (ch) {
      case "{":
        this.stack.push({ type: "object", key: null, expectKey: true });
        break;
      case "[":
        this.stack.push({ type: "array", index: 0 });
        break;
      case "}":
      case "]":
        this.stack.pop();
        break;
      case ",":
        if (top?.type === "object") {
          top.expectKey = true;
          top.key = null;
        } else if (top?.type === "array") {
          top.index++;
        }
        break;
      case ":":
        if (top?.type === "object") top.expectKey = false;
        break;
      case '"':
        this.inString = true;
        this.isKey = top?.type === "object" && top.expectKey;
        this.buf = "";
        break;
    }
  }
}

export function checkTermsLength(termsText) {
  const text = String(termsText ?? "").trim();
  if (text.length < MIN_CHARS) {
    throw new UserError("That's too short to be a full set of terms. Paste the whole page, or try a link.");
  }
  if (text.length > MAX_CHARS) {
    throw new UserError(`That's ${text.length.toLocaleString("en-US")} characters, more than the ${MAX_CHARS.toLocaleString("en-US")} this game reads. Paste just the main terms section.`);
  }
  return text;
}

const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, Math.round(Number(n) || 0)));

// Returns the option that matches `answer`, ignoring case and spacing, or null.
function matchOption(options, answer) {
  return options.find((o) => o === answer) ?? options.find((o) => squash(o) === squash(answer)) ?? null;
}

function checkTwist(twist, sourceText, puzzles) {
  if (!twist) return null;
  const original = findVerbatim(sourceText, twist.original ?? "");
  if (!original || original.length > 600) return null;
  // The twist must not rewrite a sentence a puzzle relies on.
  if (puzzles.some((p) => squash(p.quote).includes(squash(original)) || squash(original).includes(squash(p.quote)))) return null;
  if (!twist.altered?.trim() || squash(twist.altered) === squash(original)) return null;
  const options = (twist.options ?? []).filter((o) => o.trim());
  const answer = matchOption(options, twist.answer ?? "");
  if (options.length !== 4 || !answer) return null;
  return {
    clause_ref: twist.clause_ref,
    original,
    altered: twist.altered.trim(),
    question: twist.question,
    options,
    answer,
    plain_english: twist.plain_english,
  };
}

function checkDread(dread) {
  if (!dread) return null;
  return {
    score: clamp(dread.score, 0, 100),
    label: dread.label.trim(),
    reasons: (dread.reasons ?? []).slice(0, 6).map((r) => ({
      category: r.category,
      severity: clamp(r.severity, 1, 3),
      summary: r.summary,
    })),
  };
}

function validate(room, sourceText, themeId) {
  if (!room.is_terms) {
    throw new UserError("That doesn't look like terms & conditions. Try the site's terms, privacy policy or user agreement.");
  }
  const objects = THEMES[themeId].objects;
  const byObject = new Map(room.puzzles.map((p) => [p.object, p]));
  // Puzzles come in lock order; if Claude mislabelled objects, trust the order.
  const labelled = objects.every((o) => byObject.has(o.id));
  const source = squash(sourceText);

  const puzzles = objects.map(({ id }, i) => {
    const p = labelled ? byObject.get(id) : room.puzzles.length === objects.length ? room.puzzles[i] : null;
    if (!p) throw new UserError("The spirits only built part of the room. Try generating again.");
    let answer = p.answer.trim();
    let options = [];
    if (p.kind === "choice") {
      options = p.options.filter((o) => o.trim());
      answer = matchOption(options, answer);
      if (options.length < 2 || !answer) {
        throw new UserError("One of the generated puzzles was broken. Try generating again.");
      }
    }
    return {
      ...p,
      object: id,
      answer,
      options,
      accepted: p.kind === "choice" ? [] : p.accepted,
      // Flag quotes the model may have paraphrased, so the game can say so.
      verified: source.includes(squash(p.quote)),
      // Each solved object reveals one digit of the door code.
      digit: String(Math.floor(Math.random() * 10)),
    };
  });

  return {
    theme: themeId,
    company: room.company,
    intro: room.intro,
    verdict: room.verdict,
    puzzles,
    doorCode: puzzles.map((p) => p.digit).join(""),
    dread: checkDread(room.dread),
    twist: checkTwist(room.twist, sourceText, puzzles),
    termsText: sourceText,
  };
}

function roomBrief(themeId) {
  const theme = THEMES[themeId];
  const objects = theme.objects.map((o, i) => `${i + 1}. "${o.id}": ${o.name}, ${o.description}`).join("\n");
  return `The room is ${theme.name.replace(/^The /, "the ")}. The way out is ${theme.exit}. Its five objects, in lock order:\n${objects}`;
}

/**
 * Builds a room from terms text with Claude.
 *
 * options:
 *   theme     a key of THEMES; random if left out
 *   onClause  ({ ref, title, quote }) => void, as each puzzle's clause is written
 *   onStatus  (message) => void, for progress messages
 *   signal    an AbortSignal that cancels the Claude request
 *
 * Returns the room without id/createdAt; save it with saveRoom.
 */
export async function generateRoom(termsText, { theme, onClause, onStatus, signal } = {}) {
  const text = checkTermsLength(termsText);
  const themeId = theme ?? randomThemeId();
  if (!THEMES[themeId]) throw new UserError(`There's no room called "${themeId}".`);
  if (signal?.aborted) throw signal.reason ?? new Error("Aborted");

  // Emit each puzzle's clause once its quote and clause_ref are complete.
  const found = new Map();
  const announced = new Set();
  const stages = new Set();
  const scanner = new JsonStringScanner((path, value) => {
    const [section, index, field] = path;
    if (!stages.has(section) && (section === "twist" || section === "dread")) {
      stages.add(section);
      onStatus?.(section === "twist" ? "Hiding a trap in the fine print…" : "Measuring the dread…");
    }
    if (section !== "puzzles" || typeof index !== "number" || path.length !== 3) return;
    const p = found.get(index) ?? {};
    p[field] = value;
    found.set(index, p);
    if (!announced.has(index) && p.quote?.trim() && p.clause_ref?.trim()) {
      announced.add(index);
      onClause?.({ ref: p.clause_ref.trim(), title: (p.topic || p.title || p.clause_ref).trim(), quote: p.quote.trim() });
    }
  });

  client ??= new Anthropic();
  const stream = client.beta.messages.stream({
    model: MODEL,
    max_tokens: 32000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    thinking: { type: "adaptive" },
    output_config: {
      effort: "medium",
      format: { type: "json_schema", schema: roomSchema(THEMES[themeId].objects.map((o) => o.id)) },
    },
    system: SYSTEM,
    messages: [
      {
        role: "user",
        content: `${roomBrief(themeId)}\n\n<terms>\n${text}\n</terms>\n\nBuild the escape room from these terms.`,
      },
    ],
  });

  const onAbort = () => stream.abort();
  signal?.addEventListener("abort", onAbort, { once: true });
  let response;
  try {
    stream.on("text", (delta) => scanner.push(delta));
    response = await stream.finalMessage();
  } finally {
    signal?.removeEventListener("abort", onAbort);
  }

  if (response.stop_reason === "refusal") {
    throw new UserError("Claude declined to build a room from this text. Try a different site's terms.");
  }
  if (response.stop_reason === "max_tokens") {
    throw new UserError("The room came out too long and was cut off. Try generating again.");
  }

  // After a mid-stream fallback the answer can span several text blocks.
  const texts = response.content.filter((b) => b.type === "text").map((b) => b.text);
  if (!texts.length) throw new UserError("Claude returned no room. Try generating again.");
  let parsed;
  for (const candidate of [texts.join(""), texts.at(-1)]) {
    try {
      parsed = JSON.parse(candidate);
      break;
    } catch {}
  }
  if (!parsed) throw new UserError("The room came out garbled. Try generating again.");
  return validate(parsed, text, themeId);
}
