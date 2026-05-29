import { Router } from "express";
import teacherRoutes from "./teacherRoutes";
import parentRoutes from "./parentRoutes";

const router = Router();

// Mount sub-routers
router.use("/teachers", teacherRoutes);
router.use("/parents", parentRoutes);

export default router;
