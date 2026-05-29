import type { Knex } from "knex";
import db from "../database/connection";
import { Offering } from "./types";

export class OfferingRepository {
  private getDb(trx?: Knex.Transaction) {
    return trx || db;
  }

  async create(offering: Offering, trx?: Knex.Transaction): Promise<void> {
    await this.getDb(trx)("offerings").insert({
      id: offering.id,
      course_id: offering.course_id,
      teacher_id: offering.teacher_id,
      name: offering.name,
      capacity: offering.capacity,
    });
  }

  async findById(id: string, trx?: Knex.Transaction): Promise<Offering | null> {
    const query = this.getDb(trx)("offerings").where({ id });
    
    // Acquire a row-level write lock if in a transaction
    if (trx) {
      query.forUpdate();
    }

    const offering = await query.first();
    return offering || null;
  }

  async findAvailable(): Promise<any[]> {
    // Select offerings that have at least one session scheduled
    const offerings = await db("offerings as o")
      .join("courses as c", "o.course_id", "c.id")
      .join("teachers as t", "o.teacher_id", "t.id")
      .whereExists(function () {
        this.select("*")
          .from("sessions as s")
          .whereRaw("s.offering_id = o.id");
      })
      .select(
        "o.id as offering_id",
        "o.name as offering_name",
        "c.id as course_id",
        "c.title as course_title",
        "c.description as course_description",
        "t.id as teacher_id",
        "t.name as teacher_name",
        "t.email as teacher_email",
        "o.capacity"
      );

    const result = [];

    for (const offering of offerings) {
      // Get all sessions for this offering
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
        teacher: {
          id: offering.teacher_id,
          name: offering.teacher_name,
          email: offering.teacher_email,
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
