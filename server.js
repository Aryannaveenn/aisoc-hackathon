import express from "express";
import Anthropic from "@anthropic-ai/sdk";
import { fetchTerms } from "./lib/fetchTerms.js";
import { generateRoom } from "./lib/generateRoom.js";
import { UserError } from "./lib/errors.js";

const app = express();
const PORT = process.env.PORT ?? 3000;

app.use(express.json({ limit: "2mb" }));
app.use(express.static("public"));

app.post("/api/room", async (req, res) => {
  const { url, text } = req.body ?? {};
  try {
    let terms = typeof text === "string" ? text : "";
    if (!terms.trim()) {
      if (typeof url !== "string" || !url.trim()) {
        return res.status(400).json({ error: "Give a link to the terms, or paste the text." });
      }
      terms = await fetchTerms(url.trim());
    }
    res.json(await generateRoom(terms));
  } catch (err) {
    if (err instanceof Anthropic.AuthenticationError) {
      return res.status(500).json({ error: "The server has no valid Anthropic API key. Set ANTHROPIC_API_KEY and restart, or play the demo room." });
    }
    if (err instanceof Anthropic.RateLimitError) {
      return res.status(429).json({ error: "Too many rooms are being summoned right now. Wait a minute and try again." });
    }
    if (err instanceof Anthropic.APIError) {
      console.error(err);
      return res.status(502).json({ error: "Claude couldn't build the room just now. Try again in a moment." });
    }
    if (err instanceof UserError) {
      return res.status(400).json({ error: err.message });
    }
    console.error(err);
    res.status(500).json({ error: "Something went wrong building the room." });
  }
});

app.listen(PORT, () => {
  console.log(`Terms of Dread is haunting http://localhost:${PORT}`);
});
