import { Router } from "express";
import {
  create,
  getPublic,
  listAdmin,
  listPublic,
  remove,
  update,
} from "../controllers/product.controller";
import { requireAuth } from "../middlewares/auth";

const publicRouter = Router();
const adminRouter = Router();

publicRouter.get("/", listPublic);
publicRouter.get("/:identifier", getPublic);
publicRouter.post("/", requireAuth, create);
publicRouter.patch("/:id", requireAuth, update);
publicRouter.delete("/:id", requireAuth, remove);

adminRouter.get("/", requireAuth, listAdmin);

export { publicRouter as productRouter, adminRouter as adminProductRouter };
