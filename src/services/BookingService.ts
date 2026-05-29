import db from "../database/connection";
import { randomUUID } from "crypto";
import { ParentRepository } from "../repositories/ParentRepository";
import { OfferingRepository } from "../repositories/OfferingRepository";
import { SessionRepository } from "../repositories/SessionRepository";
import { BookingRepository } from "../repositories/BookingRepository";
import { NotFoundError, ConflictError, CapacityExceededError, ValidationError } from "../errors";

export class BookingService {
  private parentRepo = new ParentRepository();
  private offeringRepo = new OfferingRepository();
  private sessionRepo = new SessionRepository();
  private bookingRepo = new BookingRepository();

  /**
   * Executes the transaction to book a class offering for a parent.
   * Leverages pessimistic locks to safely handle concurrent bookings.
   */
  async bookOffering(parentId: string, offeringId: string): Promise<any> {
    return await db.transaction(async (trx) => {
      // Lock parent row to serialize booking requests and prevent overlapping schedules
      const parent = await this.parentRepo.findById(parentId, trx);
      if (!parent) {
        throw new NotFoundError(`Parent with ID '${parentId}' does not exist.`);
      }

      // Lock offering row to serialize requests and prevent capacity exhaustion
      const offering = await this.offeringRepo.findById(offeringId, trx);
      if (!offering) {
        throw new NotFoundError(`Offering with ID '${offeringId}' does not exist.`);
      }

      // Enforce composite unique check
      const alreadyBooked = await this.bookingRepo.hasBooked(parentId, offeringId, trx);
      if (alreadyBooked) {
        throw new ValidationError("Parent has already booked this offering.");
      }

      // Enforce offering capacity limits
      const currentBookings = await this.bookingRepo.countByOfferingId(offeringId, trx);
      if (currentBookings >= offering.capacity) {
        throw new CapacityExceededError(
          `Offering is fully booked. Capacity of ${offering.capacity} has been reached.`
        );
      }

      // Validate session schedule overlaps
      const conflict = await this.sessionRepo.checkOverlap(parentId, offeringId, trx);
      if (conflict) {
        throw new ConflictError(
          `Schedule conflict detected! A session overlaps with your booking for '${conflict.booked_course_title} - ${conflict.booked_offering_name}'.`,
          {
            conflict: {
              bookedCourse: conflict.booked_course_title,
              bookedOffering: conflict.booked_offering_name,
              bookedSession: {
                start: conflict.booked_start,
                end: conflict.booked_end,
              },
              newSession: {
                start: conflict.new_start,
                end: conflict.new_end,
              },
            },
          }
        );
      }

      // Create new booking record
      const bookingId = randomUUID();
      const booking = {
        id: bookingId,
        offering_id: offeringId,
        parent_id: parentId,
        booked_at: new Date(),
      };

      await this.bookingRepo.create(booking, trx);

      return {
        bookingId: booking.id,
        offeringId: booking.offering_id,
        parentId: booking.parent_id,
        bookedAt: booking.booked_at,
      };
    });
  }

  async getParentBookings(parentId: string): Promise<any[]> {
    const parent = await this.parentRepo.findById(parentId);
    if (!parent) {
      throw new NotFoundError(`Parent with ID '${parentId}' does not exist.`);
    }
    return this.bookingRepo.findByParentId(parentId);
  }
}
