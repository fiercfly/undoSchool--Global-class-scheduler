import { DateTime } from "luxon";

/**
 * Parses a date-time input string into a standard Javascript UTC Date.
 * If a specific timezone is provided, the input is parsed as a local time within that zone.
 * Otherwise, it parses standard ISO 8601 strings (which contain their own offsets or Z).
 */
export function parseToUTC(timeStr: string, timezone?: string): Date {
  let dt: DateTime;

  if (timezone) {
    // Try ISO format (e.g. 2026-06-06T18:00:00) with custom zone
    dt = DateTime.fromISO(timeStr, { zone: timezone });
    if (!dt.isValid) {
      // Try space format (e.g. 2026-06-06 18:00:00) with custom zone
      dt = DateTime.fromFormat(timeStr, "yyyy-MM-dd HH:mm:ss", { zone: timezone });
    }
    if (!dt.isValid) {
      // Try short format (e.g. 2026-06-06 18:00)
      dt = DateTime.fromFormat(timeStr, "yyyy-MM-dd HH:mm", { zone: timezone });
    }
  } else {
    dt = DateTime.fromISO(timeStr);
  }

  if (!dt.isValid) {
    throw new Error(`Invalid date or format: '${timeStr}'. Expected ISO format or 'yyyy-MM-dd HH:mm:ss'.`);
  }

  return dt.toJSDate();
}

export interface FormattedTime {
  utc: string;
  localTime: string;
  display: string;
  timezone: string;
}

/**
 * Formats a UTC date or ISO string into a rich timezone-specific object.
 */
export function formatInTimezone(
  dateInput: Date | string | number,
  timezone: string
): FormattedTime {
  let dt: DateTime;

  if (dateInput instanceof Date) {
    dt = DateTime.fromJSDate(dateInput);
  } else if (typeof dateInput === "number") {
    dt = DateTime.fromMillis(dateInput);
  } else if (typeof dateInput === "string") {
    dt = DateTime.fromISO(dateInput);
    if (!dt.isValid) {
      // Try parsing SQL datetime format e.g. "2026-06-06 12:30:00"
      dt = DateTime.fromSQL(dateInput);
    }
  } else {
    dt = DateTime.invalid("unknown type");
  }

  if (!dt.isValid) {
    throw new Error(`Invalid date input for timezone conversion: '${dateInput}'.`);
  }

  const localizedDt = dt.setZone(timezone);

  return {
    utc: dt.toUTC().toISO() || "",
    localTime: localizedDt.toFormat("yyyy-MM-dd hh:mm a"),
    display: localizedDt.toFormat("EEEE, MMM d, yyyy, hh:mm a (ZZZZ)"),
    timezone: timezone,
  };
}
