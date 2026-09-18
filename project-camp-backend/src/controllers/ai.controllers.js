import { generateAIResponse } from "../utils/gemini.js";

export const generateAIResponseController = async (req, res) => {
  try {
    const { prompt } = req.body;

    if (!prompt) {
      return res.status(400).json({
        message: "Prompt is required",
      });
    }

    const result = await generateAIResponse(prompt);

    return res.status(200).json({
      success: true,
      result,
    });
  } catch (error) {
    console.error("Gemini error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to generate AI response",
    });
  }
};