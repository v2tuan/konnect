import express from "express";
import authMiddleware from "../middlewares/authMiddleware";
import {notificationController as NotificationController} from "~/controllers/notificationController";

const router = express.Router();

router.get("/", NotificationController.list);
router.patch("/read", authMiddleware, NotificationController.markRead);
router.patch("/mark-all-read", authMiddleware, NotificationController.markAllRead);

export default router;