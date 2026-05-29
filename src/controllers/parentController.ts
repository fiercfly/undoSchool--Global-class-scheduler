import type { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { OfferingService } from "../services/OfferingService";
import { BookingService } from "../services/BookingService";
import { formatInTimezone } from "../utils/timezone";

const bookOfferingSchema = z.object({
  parentId: z.string().uuid("parentId must be a valid UUID"),
  offeringId: z.string().uuid("offeringId must be a valid UUID"),
});

export class ParentController {
  private offeringService = new OfferingService();
  private bookingService = new BookingService();

  getAvailableOfferings = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const timezone = req.query.timezone as string | undefined;
      const offerings = await this.offeringService.getAvailableOfferings(timezone);

      res.status(200).json({
        status: "success",
        data: offerings,
      });
    } catch (err) {
      next(err);
    }
  };

  bookOffering = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const validatedData = bookOfferingSchema.parse(req.body);
      const booking = await this.bookingService.bookOffering(
        validatedData.parentId,
        validatedData.offeringId
      );

      res.status(201).json({
        status: "success",
        data: booking,
      });
    } catch (err) {
      next(err);
    }
  };

  getBookings = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { parentId } = req.params;
      const timezone = req.query.timezone as string | undefined;

      if (!parentId) {
        res.status(400).json({ error: "parentId parameter is required" });
        return;
      }

      const bookings = await this.bookingService.getParentBookings(parentId);

      if (!timezone) {
        res.status(200).json({
          status: "success",
          data: bookings,
        });
        return;
      }

      // If a timezone is specified, format the session timings accordingly
      const localizedBookings = bookings.map((booking) => ({
        ...booking,
        sessions: booking.sessions.map((s: any) => {
          const timeInput = s.startTime instanceof Date ? s.startTime : new Date(s.startTime);
          const endTimeInput = s.endTime instanceof Date ? s.endTime : new Date(s.endTime);
          
          const localizedStart = formatInTimezone(timeInput, timezone);
          const localizedEnd = formatInTimezone(endTimeInput, timezone);

          return {
            sessionId: s.sessionId,
            utcStartTime: localizedStart.utc,
            utcEndTime: localizedEnd.utc,
            localTimezone: timezone,
            localStartTime: localizedStart.localTime,
            localEndTime: localizedEnd.localTime,
            displayStartTime: localizedStart.display,
            displayEndTime: localizedEnd.display,
          };
        }),
      }));

      res.status(200).json({
        status: "success",
        data: localizedBookings,
      });
    } catch (err) {
      next(err);
    }
  };
}
