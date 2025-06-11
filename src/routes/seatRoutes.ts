import { Router } from "express";
import {
  confirmSeats,
  lockSeats,
  releaseLocksForSession,
  getAvailableSeats,
} from "../controllers/seatController";

const router = Router();
router.get("/:eventID", getAvailableSeats);
router.post("/lock", lockSeats);
router.post("/confirm", confirmSeats);
router.post("/release-lock", releaseLocksForSession);

export default router;
