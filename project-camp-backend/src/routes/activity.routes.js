import { Router } from "express";

import {
  startActivity,
  stopActivity,
  getWeeklyActivity,
} from "../controllers/activity.controllers.js";

import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

// All activity routes require a logged-in user
router.use(verifyJWT);

// Start a work session
router.post("/start", startActivity);

// Stop a work session
router.post("/stop/:sessionId", stopActivity);

// Get this week's work statistics
router.get("/week", getWeeklyActivity);

export default router;