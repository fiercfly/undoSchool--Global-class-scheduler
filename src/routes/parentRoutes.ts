import { Router } from "express";
import { ParentController } from "../controllers/parentController";

const router = Router();
const controller = new ParentController();

router.get("/offerings", controller.getAvailableOfferings);
router.post("/bookings", controller.bookOffering);
router.get("/:parentId/bookings", controller.getBookings);

export default router;
