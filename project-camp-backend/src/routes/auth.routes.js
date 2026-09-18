import { Router } from "express";
import {
  firebaseAuth,
  getCurrentUser,
  logoutUser,
  checkEmail,
} from "../controllers/auth.controllers.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

// unsecured route — exchanges a Firebase ID token for a synced local user record
router.route("/firebase").post(firebaseAuth);

// secured routes
router.route("/logout").post(verifyJWT, logoutUser);
router.route("/current-user").post(verifyJWT, getCurrentUser);
router.post("/check-email", checkEmail);
export default router;
