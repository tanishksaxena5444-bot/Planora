import { api } from "../api/client";

/**
 * Free-form AI call — returns plain text.
 * `options` is passed straight through to the API client (e.g. { signal }).
 */
export async function askAI(prompt, instruction = "", options = {}) {
  const finalPrompt = instruction
    ? `${prompt}\n\nAdditional instruction:\n${instruction}`
    : prompt;

  const response = await api.generateAI(finalPrompt, options);
  return response?.result || "";
}

/**
 * Pulls a JSON value out of a raw model response. Models sometimes wrap
 * JSON in ```json fences despite being told not to — try the raw text
 * first, then a fenced-stripped version, before giving up.
 */
export function extractJSON(text) {
  if (!text || !text.trim()) {
    throw new Error("The AI did not return a response.");
  }

  const candidates = [
    text.trim(),
    text
      .trim()
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim(),
  ];

  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate);
    } catch {
      // try the next candidate
    }
  }

  throw new Error("The AI returned a response that wasn't valid JSON.");
}

/**
 * Calls the AI with a prompt that is expected to return a JSON object or
 * array, and returns the parsed value. Throws a user-friendly error if the
 * response is missing or malformed, so callers don't each need their own
 * try/catch + fence-stripping + shape-check boilerplate.
 */
export async function askAIForJSON(prompt, options = {}) {
  const response = await api.generateAI(prompt, options);
  const parsed = extractJSON(response?.result || "");

  if (parsed === null || typeof parsed !== "object") {
    throw new Error("The AI returned an unexpected response format.");
  }

  return parsed;
}

/** True when an error came from an aborted (cancelled) fetch. */
export function isAbortError(error) {
  return error?.name === "AbortError";
}
