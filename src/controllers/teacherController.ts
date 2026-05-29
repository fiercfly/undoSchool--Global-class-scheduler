import type { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { TeacherService } from "../services/TeacherService";

// Validation schemas using Zod
const createOfferingSchema = z.object({
  teacherId: z.string().uuid("teacherId must be a valid UUID"),
  courseId: z.string().uuid("courseId must be a valid UUID"),
  name: z.string().min(1, "Offering name is required"),
  capacity: z.number().int().positive("Capacity must be a positive integer").default(10),
});

const addSessionsSchema = z.object({
  teacherId: z.string().uuid("teacherId must be a valid UUID"),
  timezone: z.string().optional(), // Teacher timezone (e.g. "Asia/Kolkata")
  sessions: z.array(
    z.object({
      startTime: z.string().min(1, "startTime is required"),
      endTime: z.string().min(1, "endTime is required"),
    })
  ).min(1, "At least one session must be provided"),
});

export class TeacherController {
  private teacherService = new TeacherService();

  createOffering = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const validatedData = createOfferingSchema.parse(req.body);
      const offering = await this.teacherService.createOffering(
        validatedData.teacherId,
        validatedData.courseId,
        validatedData.name,
        validatedData.capacity
      );

      res.status(201).json({
        status: "success",
        data: offering,
      });
    } catch (err) {
      next(err);
    }
  };

  addSessions = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { offeringId } = req.params;
      const validatedData = addSessionsSchema.parse(req.body);

      const sessions = await this.teacherService.addSessionsToOffering(
        validatedData.teacherId,
        offeringId,
        validatedData.sessions,
        validatedData.timezone
      );

      res.status(201).json({
        status: "success",
        data: sessions,
      });
    } catch (err) {
      next(err);
    }
  };

  getOfferings = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { teacherId } = req.params;
      if (!teacherId) {
        res.status(400).json({ error: "teacherId parameter is required" });
        return;
      }

      const offerings = await this.teacherService.getTeacherOfferings(teacherId);

      res.status(200).json({
        status: "success",
        data: offerings,
      });
    } catch (err) {
      next(err);
    }
  };
}
