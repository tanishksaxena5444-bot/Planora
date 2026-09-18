import { Router } from "express";

import {
  createProjectActivity,
  getProjectActivity,
} from "../controllers/projectactivity.controllers.js";

import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.use(verifyJWT);

router
  .route("/:projectId")
  .get(getProjectActivity)
  .post(createProjectActivity);

export default router;