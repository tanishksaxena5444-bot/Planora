import { Router } from "express";
import {
  getNotifications,
  markNotificationRead,
} from "../controllers/notification.controllers.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.use(verifyJWT);

router.get("/", getNotifications);
router.patch("/:notificationId/read", markNotificationRead);

export default router;
