import type { Knex } from "knex";
import db from "../database/connection";
import { Session } from "./types";

export class SessionRepository {
  private getDb(trx?: Knex.Transaction) {
    return trx || db;
  }

  async createMany(sessions: Session[], trx?: Knex.Transaction): Promise<void> {
    const dbClient = this.getDb(trx);
    // Knex batch insert is safer and faster for multiple rows
    await dbClient("sessions").insert(
      sessions.map((s) => ({
        id: s.id,
        offering_id: s.offering_id,
        teacher_id: s.teacher_id,
        start_time: s.start_time instanceof Date ? s.start_time.toISOString() : s.start_time,
        end_time: s.end_time instanceof Date ? s.end_time.toISOString() : s.end_time,
      }))
    );
  }

  async findByOfferingId(offeringId: string): Promise<Session[]> {
    return db("sessions").where({ offering_id: offeringId }).orderBy("start_time", "asc");
  }

  /**
   * Checks if any sessions in the new offering overlap with ANY sessions of offerings
   * that the parent has already booked.
   * Returns conflict details if found, or null if no conflict.
   */
  async checkOverlap(
    parentId: string,
    offeringId: string,
    trx: Knex.Transaction
  ): Promise<any | null> {
    const conflict = await trx("sessions as s_booked")
      .join("bookings as b", "b.offering_id", "s_booked.offering_id")
      .join("offerings as o_booked", "o_booked.id", "b.offering_id")
      .join("courses as c_booked", "c_booked.id", "o_booked.course_id")
      .join("sessions as s_new", "s_new.offering_id", trx.raw("?", [offeringId]))
      .where("b.parent_id", parentId)
      .andWhere("s_booked.start_time", "<", trx.ref("s_new.end_time"))
      .andWhere("s_new.start_time", "<", trx.ref("s_booked.end_time"))
      .select(
        "s_booked.id as booked_session_id",
        "s_booked.start_time as booked_start",
        "s_booked.end_time as booked_end",
        "o_booked.name as booked_offering_name",
        "c_booked.title as booked_course_title",
        "s_new.id as new_session_id",
        "s_new.start_time as new_start",
        "s_new.end_time as new_end"
      )
      .first();

    return conflict || null;
  }
}
