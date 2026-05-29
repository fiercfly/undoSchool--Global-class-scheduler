import type { Knex } from "knex";
import db from "../database/connection";
import { Booking } from "./types";

export class BookingRepository {
  private getDb(trx?: Knex.Transaction) {
    return trx || db;
  }

  async create(booking: Booking, trx: Knex.Transaction): Promise<void> {
    await trx("bookings").insert({
      id: booking.id,
      offering_id: booking.offering_id,
      parent_id: booking.parent_id,
      booked_at: booking.booked_at instanceof Date ? booking.booked_at.toISOString() : booking.booked_at,
    });
  }

  async countByOfferingId(offeringId: string, trx?: Knex.Transaction): Promise<number> {
    const res = await this.getDb(trx)("bookings")
      .where("offering_id", offeringId)
      .count({ count: "*" })
      .first();
    return Number(res?.count || 0);
  }

  async hasBooked(
    parentId: string,
    offeringId: string,
    trx?: Knex.Transaction
  ): Promise<boolean> {
    const booking = await this.getDb(trx)("bookings")
      .where({ parent_id: parentId, offering_id: offeringId })
      .first();
    return !!booking;
  }

  async findByParentId(parentId: string): Promise<any[]> {
    const bookings = await db("bookings as b")
      .join("offerings as o", "b.offering_id", "o.id")
      .join("courses as c", "o.course_id", "c.id")
      .join("teachers as t", "o.teacher_id", "t.id")
      .where("b.parent_id", parentId)
      .select(
        "b.id as booking_id",
        "b.booked_at",
        "o.id as offering_id",
        "o.name as offering_name",
        "c.id as course_id",
        "c.title as course_title",
        "c.description as course_description",
        "t.id as teacher_id",
        "t.name as teacher_name",
        "t.email as teacher_email"
      )
      .orderBy("b.booked_at", "desc");

    const result = [];

    for (const booking of bookings) {
      // Fetch sessions for this booked offering
      const sessions = await db("sessions")
        .where("offering_id", booking.offering_id)
        .select("id as session_id", "start_time", "end_time")
        .orderBy("start_time", "asc");

      result.push({
        bookingId: booking.booking_id,
        bookedAt: booking.booked_at,
        offeringId: booking.offering_id,
        offeringName: booking.offering_name,
        course: {
          id: booking.course_id,
          title: booking.course_title,
          description: booking.course_description,
        },
        teacher: {
          id: booking.teacher_id,
          name: booking.teacher_name,
          email: booking.teacher_email,
        },
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
