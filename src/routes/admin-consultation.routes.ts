import { Router } from "express";
import {
  adminBookings,
  adminConsultationStats,
  adminClinics,
  adminCreateSchedule,
  adminSchedules,
  adminUpdateBooking,
  adminUpdateSchedule,
} from "../controllers/consultation.controller";
import { requireAuth } from "../middlewares/auth";

const router = Router();

router.use(requireAuth);
router.get("/stats", adminConsultationStats);
router.get("/bookings", adminBookings);
router.patch("/bookings/:id", adminUpdateBooking);
router.get("/schedules", adminSchedules);
router.post("/schedules", adminCreateSchedule);
router.patch("/schedules/:id", adminUpdateSchedule);
router.get("/clinics", adminClinics);

export { router as adminConsultationRouter };
