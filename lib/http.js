// Turns errors into JSON responses the client can show to players.

import Anthropic from "@anthropic-ai/sdk";
import { UserError } from "./errors.js";

export function errorBody(err) {
  if (err instanceof UserError) return { status: 400, error: err.message };
  if (err instanceof Anthropic.AuthenticationError) {
    return { status: 500, error: "The server has no valid Anthropic API key. Add it to .env and restart, or play the demo room." };
  }
  if (err instanceof Anthropic.RateLimitError) {
    return { status: 429, error: "Too many spirits are being summoned right now. Wait a minute and try again." };
  }
  if (err instanceof Anthropic.APIError) {
    console.error(err);
    return { status: 502, error: "Claude couldn't answer just now. Try again in a moment." };
  }
  console.error(err);
  return { status: 500, error: "Something went wrong in the spirit world." };
}

export function sendError(res, err) {
  const { status, error } = errorBody(err);
  res.status(status).json({ error });
}
