import { Router } from "express";
import { TeacherController } from "../controllers/teacherController";

const router = Router();
const controller = new TeacherController();

router.post("/offerings", controller.createOffering);
router.post("/offerings/:offeringId/sessions", controller.addSessions);
router.get("/:teacherId/offerings", controller.getOfferings);

export default router;
