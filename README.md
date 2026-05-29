# Global Class Offering Booking System

A backend service built with **Node.js, TypeScript, Express, and Knex.js** for scheduling and booking global class offerings.

It features database-agnostic design (SQLite for local testing, PostgreSQL for production), strict transactional row-level locking for concurrency control, and timezone localization.

---

## Relational Schema

- **`courses`**: Course catalog metadata (e.g., Python Coding).
- **`teachers`**: Teacher account records.
- **`parents`**: Parent account records.
- **`offerings`**: Sections/batches of a course with a specific capacity, taught by a teacher.
- **`sessions`**: Start/end times (stored in UTC) belonging to an offering.
- **`bookings`**: Parent registrations at the offering level. Employs a composite unique constraint `["offering_id", "parent_id"]` to prevent double registrations.

---

## Getting Started

### 1. Installation
```bash
npm install
```

### 2. Database Setup & Start
The system is configured to run out of the box using SQLite. Running `npm run dev` will automatically apply migrations, seed sample accounts, and start the Express server:
```bash
npm run dev
```
The server will listen at `http://localhost:3000`. Seed profile IDs will be logged directly to the terminal console on startup.

### 3. PostgreSQL Configuration (Optional)
To use PostgreSQL, set the connection URL in `.env`:
```env
DATABASE_URL=postgresql://username:password@localhost:5432/database_name
```
Then run:
```bash
npm run db:migrate
npm run db:seed
```

---

## Running Tests

### 1. Integration Tests
Executes database-level integrity, timezone offset translations, and schema validation tests:
```bash
npm run test
```

### 2. Concurrency Stress Test
Fires parallel HTTP requests to verify row-locking protections under heavy race conditions:
```bash
npm run test:concurrency
```

---

## Concurrency Safeguards

1. **Rule 1 (Capacity Check)**: Blocks registrations when class capacity is reached.
2. **Rule 2 (Time Conflict Block)**: Uses database transaction isolation to detect overlapping schedules for a parent and blocks the booking with a `409 Conflict` error, returning the exact conflicting times.
3. **Rule 3 (Strict Write Serialization)**: Leverages pessimistic row locks (`SELECT ... FOR UPDATE` on `parents` and `offerings` rows) in transactions to serialize parallel booking requests, preventing overbooking and schedule overlaps.

---

## Timezone Handling Approach

- **Storage**: All session timings are stored in UTC ISO-8601 format inside the database.
- **Teacher Parsing**: Teachers can submit session dates with local timezones or offsets. The system translates them to absolute UTC before database insertion.
- **Parent Discovery**: Parent queries support a `timezone` query parameter. The system uses `luxon` to dynamically convert and format UTC dates into the parent's target local zone (e.g., translating `Asia/Kolkata` class hours to local hours for a New York parent).

---

## Assumptions Made

1. **Initial Seeds**: Courses, teachers, and parent profile contexts are preloaded inside the database schema for operational mapping.
2. **Batch Registration**: Parents book a class section offering in its entirety (meaning they register for all comprising sessions) rather than single class sessions.
3. **Conflict Detection**: Session conflicts are identified at the individual parent level based on timeline schedule overlaps across all booked offerings.

---

## API Endpoints

### Teacher APIs
- `POST /api/teachers/offerings`: Create offering section.
  - Payload: `{ teacherId: string, courseId: string, name: string, capacity: number }`
- `POST /api/teachers/offerings/:offeringId/sessions`: Schedule sessions.
  - Payload: `{ teacherId: string, timezone?: string, sessions: [{ startTime: string, endTime: string }] }`
- `GET /api/teachers/:teacherId/offerings`: Get teacher offerings and scheduled sessions.

### Parent APIs
- `GET /api/parents/offerings?timezone=America/New_York`: Get available offerings. Session timings are dynamically localized on the fly to the parent query `timezone` parameter (e.g. `America/New_York`, `Asia/Kolkata`, `Europe/London`, `UTC`).
- `POST /api/parents/bookings`: Book an entire class section.
  - Payload: `{ parentId: string, offeringId: string }`
- `GET /api/parents/:parentId/bookings?timezone=America/New_York`: Get parent bookings. Localizes session schedules dynamically to the requested `timezone`.
