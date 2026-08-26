import { Router } from "express";
import { detail, list, remove, stats, update } from "../controllers/admin-chat.controller";
import { requireAuth } from "../middlewares/auth";

const router = Router();

router.use(requireAuth);
router.get("/stats", stats);
router.get("/sessions", list);
router.get("/sessions/:id", detail);
router.patch("/sessions/:id", update);
router.delete("/sessions/:id", remove);

export { router as adminChatRouter };
