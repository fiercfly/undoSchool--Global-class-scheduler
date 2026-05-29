// Set environment to test so Knex loads the in-memory SQLite database
process.env.NODE_ENV = "test";

import request from "supertest";
import app from "../../src/app";
import db from "../../src/database/connection";
import { randomUUID } from "crypto";

describe("Global Class Offering Booking System Integration Tests", () => {
  let pythonCourseId: string;
  let artCourseId: string;
  let teacherAliceId: string;
  let teacherBobId: string;
  let parentCharlieId: string;
  let parentDanaId: string;

  beforeAll(async () => {
    // 1. Run migrations and seeds
    await db.migrate.latest();
    await db.seed.run();

    // 2. Fetch seeded IDs
    const pythonCourse = await db("courses").where({ title: "Python Coding" }).first();
    pythonCourseId = pythonCourse.id;

    const artCourse = await db("courses").where({ title: "Art Drawing Class" }).first();
    artCourseId = artCourse.id;

    const teacherAlice = await db("teachers").where({ name: "Alice Smith" }).first();
    teacherAliceId = teacherAlice.id;

    const teacherBob = await db("teachers").where({ name: "Bob Jones" }).first();
    teacherBobId = teacherBob.id;

    const parentCharlie = await db("parents").where({ name: "Charlie Brown" }).first();
    parentCharlieId = parentCharlie.id;

    const parentDana = await db("parents").where({ name: "Dana Scully" }).first();
    parentDanaId = parentDana.id;
  });

  afterAll(async () => {
    // Close connection after all tests run
    await db.destroy();
  });

  describe("Teacher APIs", () => {
    let offeringId: string;

    it("should successfully create a new class offering", async () => {
      const res = await request(app)
        .post("/api/teachers/offerings")
        .send({
          teacherId: teacherAliceId,
          courseId: pythonCourseId,
          name: "Saturday Python Batch",
          capacity: 5,
        });

      expect(res.status).toBe(201);
      expect(res.body.status).toBe("success");
      expect(res.body.data).toHaveProperty("id");
      expect(res.body.data.name).toBe("Saturday Python Batch");
      expect(res.body.data.capacity).toBe(5);

      offeringId = res.body.data.id;
    });

    it("should successfully add sessions to the offering", async () => {
      const sessions = [
        {
          startTime: "2026-06-06T18:00:00+05:30", // Saturday 6 PM - 7 PM in India (12:30 UTC)
          endTime: "2026-06-06T19:00:00+05:30",
        },
        {
          startTime: "2026-06-13T18:00:00+05:30",
          endTime: "2026-06-13T19:00:00+05:30",
        },
      ];

      const res = await request(app)
        .post(`/api/teachers/offerings/${offeringId}/sessions`)
        .send({
          teacherId: teacherAliceId,
          sessions,
        });

      expect(res.status).toBe(201);
      expect(res.body.status).toBe("success");
      expect(res.body.data).toHaveLength(2);
      expect(res.body.data[0].startTime).toBe("2026-06-06T12:30:00.000Z");
      expect(res.body.data[1].startTime).toBe("2026-06-13T12:30:00.000Z");
    });

    it("should reject adding sessions if they internally overlap", async () => {
      const sessions = [
        {
          startTime: "2026-06-20T18:00:00+05:30",
          endTime: "2026-06-20T19:00:00+05:30",
        },
        {
          startTime: "2026-06-20T18:30:00+05:30", // Overlaps with the previous session!
          endTime: "2026-06-20T19:30:00+05:30",
        },
      ];

      const res = await request(app)
        .post(`/api/teachers/offerings/${offeringId}/sessions`)
        .send({
          teacherId: teacherAliceId,
          sessions,
        });

      expect(res.status).toBe(400);
      expect(res.body.status).toBe("fail");
      expect(res.body.error).toContain("Timeline overlap detected between uploaded sessions");
    });

    it("should retrieve a teacher's schedule and offerings", async () => {
      const res = await request(app).get(`/api/teachers/${teacherAliceId}/offerings`);
      
      expect(res.status).toBe(200);
      expect(res.body.status).toBe("success");
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].offeringName).toBe("Saturday Python Batch");
      expect(res.body.data[0].sessions).toHaveLength(2);
    });
  });

  describe("Parent APIs & Timezones & Bookings", () => {
    let pythonOfferingId: string;

    beforeAll(async () => {
      // Find the Saturday Python offering we created earlier
      const offering = await db("offerings").where({ name: "Saturday Python Batch" }).first();
      pythonOfferingId = offering.id;
    });

    it("should format session schedules correctly in the parent's local timezone", async () => {
      // Query offerings using America/New_York (UTC-4) timezone
      // Indian time 18:00+05:30 is 12:30 UTC. New York time (EDT) is 12:30 - 4h = 08:30 AM
      const res = await request(app).get("/api/parents/offerings?timezone=America/New_York");

      expect(res.status).toBe(200);
      expect(res.body.status).toBe("success");
      
      const pythonOffering = res.body.data.find(
        (o: any) => o.offeringId === pythonOfferingId
      );

      expect(pythonOffering).toBeDefined();
      expect(pythonOffering.sessions[0].localTimezone).toBe("America/New_York");
      expect(pythonOffering.sessions[0].localStartTime).toBe("2026-06-06 08:30 AM");
      expect(pythonOffering.sessions[0].displayStartTime).toContain("Saturday, Jun 6, 2026, 08:30 AM (EDT)");
    });

    it("should successfully allow a parent to book an offering", async () => {
      const res = await request(app)
        .post("/api/parents/bookings")
        .send({
          parentId: parentCharlieId,
          offeringId: pythonOfferingId,
        });

      expect(res.status).toBe(201);
      expect(res.body.status).toBe("success");
      expect(res.body.data).toHaveProperty("bookingId");
      expect(res.body.data.parentId).toBe(parentCharlieId);
      expect(res.body.data.offeringId).toBe(pythonOfferingId);
    });

    it("should reject booking if the parent attempts to book the same offering twice", async () => {
      const res = await request(app)
        .post("/api/parents/bookings")
        .send({
          parentId: parentCharlieId,
          offeringId: pythonOfferingId,
        });

      expect(res.status).toBe(400);
      expect(res.body.status).toBe("fail");
      expect(res.body.error).toContain("Parent has already booked this offering");
    });

    it("should reject booking if another offering has overlapping session times (Rule 2 - Time Conflict Locking)", async () => {
      // 1. Create a second offering taught by Bob
      const offeringRes = await request(app)
        .post("/api/teachers/offerings")
        .send({
          teacherId: teacherBobId,
          courseId: artCourseId,
          name: "Art Drawing Saturday Batch",
          capacity: 10,
        });
      
      const artOfferingId = offeringRes.body.data.id;

      // 2. Add an overlapping session to the Art batch
      // Python Saturday session 1 is: 12:30 UTC - 13:30 UTC
      // We will make Art Saturday session 1: 13:00 UTC - 14:00 UTC (overlaps!)
      await request(app)
        .post(`/api/teachers/offerings/${artOfferingId}/sessions`)
        .send({
          teacherId: teacherBobId,
          sessions: [
            {
              startTime: "2026-06-06T13:00:00Z",
              endTime: "2026-06-06T14:00:00Z",
            },
          ],
        });

      // 3. Parent Charlie Brown (already booked in Python Batch) tries to book Art Batch
      const res = await request(app)
        .post("/api/parents/bookings")
        .send({
          parentId: parentCharlieId,
          offeringId: artOfferingId,
        });

      expect(res.status).toBe(409);
      expect(res.body.status).toBe("fail");
      expect(res.body.error).toContain("Schedule conflict detected");
      expect(res.body.details).toHaveProperty("conflict");
      expect(res.body.details.conflict.bookedCourse).toBe("Python Coding");
      expect(res.body.details.conflict.bookedOffering).toBe("Saturday Python Batch");
    });

    it("should reject booking if offering capacity is exceeded", async () => {
      // 1. Create an offering with capacity = 1
      const offeringRes = await request(app)
        .post("/api/teachers/offerings")
        .send({
          teacherId: teacherBobId,
          courseId: artCourseId,
          name: "Exclusive Masterclass",
          capacity: 1,
        });
      
      const masterclassId = offeringRes.body.data.id;

      // 2. Add a non-overlapping session (e.g. Monday morning)
      await request(app)
        .post(`/api/teachers/offerings/${masterclassId}/sessions`)
        .send({
          teacherId: teacherBobId,
          sessions: [
            {
              startTime: "2026-06-08T09:00:00Z",
              endTime: "2026-06-08T10:00:00Z",
            },
          ],
        });

      // 3. Parent Charlie Brown books the 1 seat (succeeds)
      const book1 = await request(app)
        .post("/api/parents/bookings")
        .send({
          parentId: parentCharlieId,
          offeringId: masterclassId,
        });
      expect(book1.status).toBe(201);

      // 4. Parent Dana Scully tries to book the same offering (fails because capacity = 1 is full)
      const book2 = await request(app)
        .post("/api/parents/bookings")
        .send({
          parentId: parentDanaId,
          offeringId: masterclassId,
        });

      expect(book2.status).toBe(422);
      expect(book2.body.status).toBe("fail");
      expect(book2.body.error).toContain("Offering is fully booked");
    });
  });
});
