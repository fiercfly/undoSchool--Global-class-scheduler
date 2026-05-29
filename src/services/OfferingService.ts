import { OfferingRepository } from "../repositories/OfferingRepository";
import { formatInTimezone } from "../utils/timezone";

export class OfferingService {
  private offeringRepo = new OfferingRepository();

  /**
   * Retrieves all offerings with scheduled sessions.
   * If a target timezone is passed (e.g. 'America/New_York'), session times
   * are translated and formatted into the parent's local timezone representation.
   */
  async getAvailableOfferings(timezone?: string): Promise<any[]> {
    const offerings = await this.offeringRepo.findAvailable();

    if (!timezone) {
      // Just return standard ISO strings if no timezone is requested
      return offerings.map((offering) => ({
        ...offering,
        sessions: offering.sessions.map((s: any) => ({
          sessionId: s.sessionId,
          startTime: s.startTime instanceof Date ? s.startTime.toISOString() : new Date(s.startTime).toISOString(),
          endTime: s.endTime instanceof Date ? s.endTime.toISOString() : new Date(s.endTime).toISOString(),
        })),
      }));
    }

    // Translate all session timings into the parent's target timezone
    return offerings.map((offering) => ({
      ...offering,
      sessions: offering.sessions.map((s: any) => {
        const timeInput = s.startTime instanceof Date ? s.startTime : new Date(s.startTime);
        const endTimeInput = s.endTime instanceof Date ? s.endTime : new Date(s.endTime);
        
        const localizedStart = formatInTimezone(timeInput, timezone);
        const localizedEnd = formatInTimezone(endTimeInput, timezone);

        return {
          sessionId: s.sessionId,
          utcStartTime: localizedStart.utc,
          utcEndTime: localizedEnd.utc,
          localTimezone: timezone,
          // E.g. "2026-06-06 06:00 PM"
          localStartTime: localizedStart.localTime,
          localEndTime: localizedEnd.localTime,
          // Friendly human readable display string (e.g., "Saturday, Jun 6, 2026, 6:00 PM (EDT)")
          displayStartTime: localizedStart.display,
          displayEndTime: localizedEnd.display,
        };
      }),
    }));
  }
}
