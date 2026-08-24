import { Router } from "express";
import {
  create,
  getPublic,
  listAdmin,
  listCategories,
  listPublic,
  remove,
  update,
} from "../controllers/doctor.controller";
import { publicDoctorSchedule } from "../controllers/consultation.controller";
import { requireAuth } from "../middlewares/auth";

const publicRouter = Router();
const adminRouter = Router();
const categoryRouter = Router();

publicRouter.get("/", listPublic);
publicRouter.get("/:identifier/schedule", publicDoctorSchedule);
publicRouter.get("/:identifier", getPublic);
publicRouter.post("/", requireAuth, create);
publicRouter.patch("/:id", requireAuth, update);
publicRouter.delete("/:id", requireAuth, remove);

adminRouter.get("/", requireAuth, listAdmin);
categoryRouter.get("/", listCategories);

export {
  publicRouter as doctorRouter,
  adminRouter as adminDoctorRouter,
  categoryRouter as doctorCategoryRouter,
};
