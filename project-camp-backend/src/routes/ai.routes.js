import express from "express";

import {
  generateAIResponseController,
} from "../controllers/ai.controllers.js";

const router = express.Router();

router.post("/generate", generateAIResponseController);

export default router;