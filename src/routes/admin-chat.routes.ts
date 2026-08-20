import { Router } from "express";
import { detail, list, stats, update } from "../controllers/admin-chat.controller";
import { requireAuth } from "../middlewares/auth";

const router = Router();

router.use(requireAuth);
router.get("/stats", stats);
router.get("/sessions", list);
router.get("/sessions/:id", detail);
router.patch("/sessions/:id", update);

export { router as adminChatRouter };
