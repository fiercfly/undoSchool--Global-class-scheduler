import db from "../database/connection";
import { randomUUID } from "crypto";
import { TeacherRepository } from "../repositories/TeacherRepository";
import { OfferingRepository } from "../repositories/OfferingRepository";
import { SessionRepository } from "../repositories/SessionRepository";
import { NotFoundError, ValidationError } from "../errors";
import { parseToUTC } from "../utils/timezone";

export class TeacherService {
  private teacherRepo = new TeacherRepository();
  private offeringRepo = new OfferingRepository();
  private sessionRepo = new SessionRepository();

  async createOffering(
    teacherId: string,
    courseId: string,
    name: string,
    capacity: number
  ): Promise<any> {
    // 1. Verify teacher exists
    const teacher = await this.teacherRepo.findById(teacherId);
    if (!teacher) {
      throw new NotFoundError(`Teacher with ID '${teacherId}' does not exist.`);
    }

    // 2. Verify course exists
    const course = await db("courses").where({ id: courseId }).first();
    if (!course) {
      throw new NotFoundError(`Course with ID '${courseId}' does not exist.`);
    }

    // 3. Create offering record
    const offeringId = randomUUID();
    const newOffering = {
      id: offeringId,
      course_id: courseId,
      teacher_id: teacherId,
      name,
      capacity,
    };

    await this.offeringRepo.create(newOffering);

    return newOffering;
  }

  async addSessionsToOffering(
    teacherId: string,
    offeringId: string,
    sessionsInput: Array<{ startTime: string; endTime: string }>,
    teacherTimezone?: string
  ): Promise<any[]> {
    // 1. Verify offering and teacher match
    const offering = await this.offeringRepo.findById(offeringId);
    if (!offering) {
      throw new NotFoundError(`Offering with ID '${offeringId}' does not exist.`);
    }

    if (offering.teacher_id !== teacherId) {
      throw new ValidationError("Teacher does not own this offering.");
    }

    if (sessionsInput.length === 0) {
      throw new ValidationError("At least one session must be provided.");
    }

    // 2. Parse sessions and perform basic chronological check
    const parsedSessions = sessionsInput.map((session) => {
      try {
        const start = parseToUTC(session.startTime, teacherTimezone);
        const end = parseToUTC(session.endTime, teacherTimezone);

        if (start.getTime() >= end.getTime()) {
          throw new ValidationError(
            `Session start time (${session.startTime}) must be before end time (${session.endTime}).`
          );
        }

        return {
          id: randomUUID(),
          offering_id: offeringId,
          teacher_id: teacherId,
          start_time: start,
          end_time: end,
        };
      } catch (err: any) {
        if (err instanceof ValidationError) throw err;
        throw new ValidationError(`Error parsing session times: ${err.message}`);
      }
    });

    // 3. Validate internal overlap within the sessions being added
    for (let i = 0; i < parsedSessions.length; i++) {
      const s1 = parsedSessions[i];
      for (let j = i + 1; j < parsedSessions.length; j++) {
        const s2 = parsedSessions[j];
        if (s1.start_time < s2.end_time && s2.start_time < s1.end_time) {
          throw new ValidationError(
            `Timeline overlap detected between uploaded sessions: [${s1.start_time.toISOString()} - ${s1.end_time.toISOString()}] and [${s2.start_time.toISOString()} - ${s2.end_time.toISOString()}].`
          );
        }
      }
    }

    // 4. Save sessions using knex transaction batch insertion
    await this.sessionRepo.createMany(parsedSessions);

    return parsedSessions.map((s) => ({
      sessionId: s.id,
      offeringId: s.offering_id,
      teacherId: s.teacher_id,
      startTime: s.start_time.toISOString(),
      endTime: s.end_time.toISOString(),
    }));
  }

  async getTeacherOfferings(teacherId: string): Promise<any[]> {
    const teacher = await this.teacherRepo.findById(teacherId);
    if (!teacher) {
      throw new NotFoundError(`Teacher with ID '${teacherId}' does not exist.`);
    }
    return this.teacherRepo.findOfferingsWithSessions(teacherId);
  }
}
