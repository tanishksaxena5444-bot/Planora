import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

const sleep = (ms) =>
  new Promise((resolve) => setTimeout(resolve, ms));

async function generateWithRetry(model, prompt) {
  const maxAttempts = 2;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      console.log(
        `Gemini request: ${model} | attempt ${attempt}/${maxAttempts}`
      );

      const response = await ai.models.generateContent({
        model,
        contents: prompt,
      });

      return response.text;
    } catch (error) {
      const status =
        Number(error?.status) ||
        Number(error?.response?.status) ||
        Number(error?.error?.code);

      console.error(
        `Gemini ${model} attempt ${attempt} failed:`,
        error?.message || error
      );

      if (
        [429, 500, 503].includes(status) &&
        attempt < maxAttempts
      ) {
        const delay = 1500 * attempt;

        console.log(
          `Temporary Gemini error (${status}). Retrying in ${delay}ms...`
        );

        await sleep(delay);
        continue;
      }

      throw error;
    }
  }

  throw new Error(
    `Gemini ${model} failed after ${maxAttempts} attempts.`
  );
}

export const generateAIResponse = async (prompt) => {
  if (!prompt || !prompt.trim()) {
    throw new Error("Prompt is required.");
  }

  // More reliable fallback order for Planora.
  const models = [
    "gemini-3.8-flash",
    "gemini-3.6-flash",
    "gemini-3.5-flash-lite",
    "gemini-3.5-flash",
    "gemini-3.7-flash",
  ];

  let lastError = null;

  for (let index = 0; index < models.length; index++) {
    const model = models[index];

    try {
      return await generateWithRetry(model, prompt);
    } catch (error) {
      lastError = error;

      console.error(
        `Gemini model failed: ${model}`,
        error?.message || error
      );

      if (index < models.length - 1) {
        console.log(
          `Trying next fallback model: ${models[index + 1]}`
        );
      }
    }
  }

  console.error(
    "All Gemini models failed:",
    lastError?.message || lastError
  );

  throw new Error(
    "Gemini is temporarily unavailable. Please try again in a moment."
  );
};