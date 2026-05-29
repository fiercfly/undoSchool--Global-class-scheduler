import db from "../database/connection";
import { Teacher } from "./types";

export class TeacherRepository {
  async findById(id: string): Promise<Teacher | null> {
    const teacher = await db("teachers").where({ id }).first();
    return teacher || null;
  }

  async findOfferingsWithSessions(teacherId: string): Promise<any[]> {
    const offerings = await db("offerings as o")
      .join("courses as c", "o.course_id", "c.id")
      .where("o.teacher_id", teacherId)
      .select(
        "o.id as offering_id",
        "o.name as offering_name",
        "c.id as course_id",
        "c.title as course_title",
        "c.description as course_description",
        "o.capacity"
      );

    const result = [];

    for (const offering of offerings) {
      // Get sessions for this offering
      const sessions = await db("sessions")
        .where("offering_id", offering.offering_id)
        .select("id as session_id", "start_time", "end_time")
        .orderBy("start_time", "asc");

      // Get bookings count
      const bookingsCountRes = await db("bookings")
        .where("offering_id", offering.offering_id)
        .count({ count: "*" })
        .first();
      
      const bookingsCount = Number(bookingsCountRes?.count || 0);

      result.push({
        offeringId: offering.offering_id,
        offeringName: offering.offering_name,
        course: {
          id: offering.course_id,
          title: offering.course_title,
          description: offering.course_description,
        },
        capacity: offering.capacity,
        bookingsCount,
        sessions: sessions.map((s) => ({
          sessionId: s.session_id,
          startTime: s.start_time,
          endTime: s.end_time,
        })),
      });
    }

    return result;
  }
}
