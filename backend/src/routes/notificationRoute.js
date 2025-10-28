import express from "express";
import authMiddleware from "../middlewares/authMiddleware";
import {notificationController as NotificationController} from "~/controllers/notificationController";

const router = express.Router();

router.get("/",authMiddleware, NotificationController.list);
router.put("/mark-read", authMiddleware, NotificationController.markRead);
router.patch("/mark-all-read", authMiddleware, NotificationController.markAllRead);

export default router;