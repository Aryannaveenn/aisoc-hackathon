// Builds the pre-built rooms in data/prebuilt from famous services' terms.
//
//   npm run rooms:prebuild                  build any rooms that don't exist yet
//   npm run rooms:prebuild -- --force       rebuild every room
//   npm run rooms:prebuild -- spotify zoom  only these rooms (add --force to rebuild them)
//   npm run rooms:prebuild -- --dry-run     only fetch and check the terms, no Claude calls

import { fetchTerms } from "../lib/fetchTerms.js";
import { generateRoom } from "../lib/generateRoom.js";
import { getRoom, saveRoom } from "../lib/roomStore.js";
import { THEME_IDS } from "../lib/themes.js";

// Themes go round-robin down this list, so keep the order stable.
const SITES = [
  { id: "spotify", company: "Spotify", url: "https://www.spotify.com/us/legal/end-user-agreement/" },
  { id: "netflix", company: "Netflix", url: "https://help.netflix.com/legal/termsofuse" },
  { id: "tiktok", company: "TikTok", url: "https://www.tiktok.com/legal/page/us/terms-of-service/en" },
  { id: "discord", company: "Discord", url: "https://discord.com/terms" },
  { id: "reddit", company: "Reddit", url: "https://redditinc.com/policies/user-agreement" },
  { id: "zoom", company: "Zoom", url: "https://www.zoom.com/en/trust/terms/" },
  { id: "apple-media-services", company: "Apple Media Services", url: "https://www.apple.com/legal/internet-services/itunes/us/terms.html" },
  { id: "amazon", company: "Amazon", url: "https://www.amazon.com/gp/help/customer/display.html?nodeId=508088" },
];

const CONCURRENCY = 2;
const MIN_TERMS_CHARS = 5_000;
const TERMS_WORDS = ["terms", "agree", "liability", "terminat", "governing law", "arbitration", "licen", "warrant", "indemn", "dispute"];

const args = process.argv.slice(2);
const force = args.includes("--force");
const dryRun = args.includes("--dry-run");
const only = args.filter((a) => !a.startsWith("--"));

const unknown = only.filter((id) => !SITES.some((s) => s.id === id));
if (unknown.length) {
  console.error(`Unknown room id(s): ${unknown.join(", ")}. Known: ${SITES.map((s) => s.id).join(", ")}`);
  process.exit(1);
}

const jobs = SITES.map((site, i) => ({ ...site, theme: THEME_IDS[i % THEME_IDS.length] })).filter(
  (s) => !only.length || only.includes(s.id),
);

function looksLikeTerms(text) {
  const lower = text.toLowerCase();
  const hits = TERMS_WORDS.filter((w) => lower.includes(w));
  if (text.length < MIN_TERMS_CHARS) return `only ${text.length} characters`;
  if (hits.length < 5) return `only ${hits.length} terms-like words (${hits.join(", ")})`;
  return null;
}

const log = (id, message) => console.log(`[${id}] ${message}`);

async function build(job) {
  if (!force && (await getRoom(job.id))) {
    log(job.id, "exists, skipping (use --force to rebuild)");
    return "skipped";
  }
  log(job.id, `fetching ${job.url}`);
  const text = await fetchTerms(job.url);
  const problem = looksLikeTerms(text);
  if (problem) throw new Error(`doesn't look like terms: ${problem}`);
  const words = text.split(/\s+/).length;
  log(job.id, `${text.length.toLocaleString("en-US")} chars, ${words.toLocaleString("en-US")} words`);
  if (dryRun) return "checked";

  log(job.id, `generating the ${job.theme} room`);
  const started = Date.now();
  const room = await generateRoom(text, {
    theme: job.theme,
    onClause: ({ ref, title }) => log(job.id, `  clause ${ref}: ${title}`),
  });
  const saved = await saveRoom({ ...room, company: job.company, sourceUrl: job.url }, { preset: true, id: job.id });
  const unverified = saved.puzzles.filter((p) => !p.verified).length;
  log(
    job.id,
    `saved in ${Math.round((Date.now() - started) / 1000)}s: dread ${saved.dread?.score} "${saved.dread?.label}", ` +
      `twist ${saved.twist ? "yes" : "dropped"}, ${unverified ? `${unverified} unverified quote(s)` : "all quotes verified"}`,
  );
  return "built";
}

const results = new Map();
const queue = [...jobs];
await Promise.all(
  Array.from({ length: Math.min(CONCURRENCY, queue.length) }, async () => {
    for (let job = queue.shift(); job; job = queue.shift()) {
      try {
        results.set(job.id, await build(job));
      } catch (err) {
        log(job.id, `FAILED: ${err.message}`);
        results.set(job.id, "failed");
      }
    }
  }),
);

console.log("\nSummary:");
for (const job of jobs) console.log(`  ${job.id.padEnd(22)} ${job.theme.padEnd(8)} ${results.get(job.id)}`);
if ([...results.values()].includes("failed")) process.exitCode = 1;
