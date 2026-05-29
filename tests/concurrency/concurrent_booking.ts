import app from "../../src/app";
import db from "../../src/database/connection";
import { randomUUID } from "crypto";
import http from "http";

const PORT = 3005;

// Helper to make a POST request using Node's native http module (to avoid dependencies)
function makePostRequest(path: string, body: any): Promise<{ status: number; body: any }> {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(body);

    const options = {
      hostname: "localhost",
      port: PORT,
      path,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(postData),
      },
    };

    const req = http.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => {
        data += chunk;
      });
      res.on("end", () => {
        try {
          resolve({
            status: res.statusCode || 0,
            body: JSON.parse(data),
          });
        } catch {
          resolve({
            status: res.statusCode || 0,
            body: data,
          });
        }
      });
    });

    req.on("error", (e) => {
      reject(e);
    });

    req.write(postData);
    req.end();
  });
}

async function runConcurrencyTests() {
  console.log("\n====================================================");
  console.log("     STARTING REAL-WORLD CONCURRENCY BENCHMARK       ");
  console.log("====================================================\n");

  // 1. Initialize DB and seed
  await db.migrate.latest();
  await db.seed.run();

  // Start Express server
  const server = app.listen(PORT, async () => {
    try {
      // Fetch seeded data
      const pythonCourse = await db("courses").where({ title: "Python Coding" }).first();
      const artCourse = await db("courses").where({ title: "Art Drawing Class" }).first();
      const teacherAlice = await db("teachers").where({ name: "Alice Smith" }).first();

      // ------------------------------------------------------------------------
      // CASE 1: MULTIPLE PARENTS BOOKING THE SAME LIMITED SEAT SIMULTANEOUSLY
      // ------------------------------------------------------------------------
      console.log("[CASE 1] 10 different parents booking an offering with capacity = 1...");

      // A. Create a highly exclusive class offering (capacity = 1)
      const offeringId = randomUUID();
      await db("offerings").insert({
        id: offeringId,
        course_id: pythonCourse.id,
        teacher_id: teacherAlice.id,
        name: "Exclusive Concurrency Workshop",
        capacity: 1,
      });

      // Add a session
      await db("sessions").insert({
        id: randomUUID(),
        offering_id: offeringId,
        teacher_id: teacherAlice.id,
        start_time: new Date("2026-07-01T15:00:00Z"),
        end_time: new Date("2026-07-01T16:00:00Z"),
      });

      // B. Create 10 distinct parents in the database
      const parents = [];
      for (let i = 1; i <= 10; i++) {
        const id = randomUUID();
        const email = `parent_concurrency_${i}_${Date.now()}@example.com`;
        await db("parents").insert({
          id,
          name: `Concurrent Parent ${i}`,
          email,
        });
        parents.push({ id, name: `Concurrent Parent ${i}` });
      }

      console.log(`[CASE 1] Created 10 parents. Launching 10 parallel HTTP bookings...`);

      // C. Fire 10 parallel requests
      const promises = parents.map((parent) =>
        makePostRequest("/api/parents/bookings", {
          parentId: parent.id,
          offeringId: offeringId,
        })
      );

      const results = await Promise.all(promises);

      // D. Analyze results
      const successes = results.filter((r) => r.status === 201);
      const capacityBlocks = results.filter((r) => r.status === 422);
      const otherErrors = results.filter((r) => r.status !== 201 && r.status !== 422);

      console.log("\n--- Case 1 Concurrency Results ---");
      console.log(`Successful Bookings:       ${successes.length} (Expected: 1)`);
      console.log(`Rejected (Capacity Block):  ${capacityBlocks.length} (Expected: 9)`);
      console.log(`Other Errors:               ${otherErrors.length} (Expected: 0)`);
      console.log("----------------------------------");

      if (successes.length === 1 && capacityBlocks.length === 9) {
        console.log("✅ CASE 1 PASSED: Strict row locks prevented double-booking/overbooking perfectly!");
      } else {
        console.log("❌ CASE 1 FAILED: Race condition detected.");
      }

      // ------------------------------------------------------------------------
      // CASE 2: SINGLE PARENT MAKING OVERLAPPING BOOKING REQUESTS SIMULTANEOUSLY
      // ------------------------------------------------------------------------
      console.log("\n[CASE 2] Same parent booking two overlapping offerings concurrently...");

      // A. Create Parent Charlie
      const parentCharlie = await db("parents").where({ name: "Charlie Brown" }).first();

      // B. Create two distinct offerings with overlapping session times
      const offeringA = randomUUID();
      const offeringB = randomUUID();

      await db("offerings").insert([
        {
          id: offeringA,
          course_id: pythonCourse.id,
          teacher_id: teacherAlice.id,
          name: "Batch A",
          capacity: 5,
        },
        {
          id: offeringB,
          course_id: artCourse.id,
          teacher_id: teacherAlice.id,
          name: "Batch B",
          capacity: 5,
        },
      ]);

      // Add overlapping sessions: both happen on July 5 at the same time
      await db("sessions").insert([
        {
          id: randomUUID(),
          offering_id: offeringA,
          teacher_id: teacherAlice.id,
          start_time: new Date("2026-07-05T18:00:00Z"),
          end_time: new Date("2026-07-05T19:00:00Z"),
        },
        {
          id: randomUUID(),
          offering_id: offeringB,
          teacher_id: teacherAlice.id,
          start_time: new Date("2026-07-05T18:30:00Z"), // Overlaps!
          end_time: new Date("2026-07-05T19:30:00Z"),
        },
      ]);

      console.log(`[CASE 2] Launching 2 simultaneous booking requests for Charlie Brown...`);

      // C. Fire 2 parallel requests from Charlie Brown
      const charliePromises = [
        makePostRequest("/api/parents/bookings", {
          parentId: parentCharlie.id,
          offeringId: offeringA,
        }),
        makePostRequest("/api/parents/bookings", {
          parentId: parentCharlie.id,
          offeringId: offeringB,
        }),
      ];

      const charlieResults = await Promise.all(charliePromises);

      // D. Analyze results
      const charlieSuccess = charlieResults.filter((r) => r.status === 201);
      const charlieConflict = charlieResults.filter((r) => r.status === 409);

      console.log("\n--- Case 2 Concurrency Results ---");
      console.log(`Successful Bookings:       ${charlieSuccess.length} (Expected: 1)`);
      console.log(`Rejected (Conflict Block):  ${charlieConflict.length} (Expected: 1)`);
      console.log("----------------------------------");

      if (charlieSuccess.length === 1 && charlieConflict.length === 1) {
        console.log("✅ CASE 2 PASSED: Strict parent locks prevented parallel overlapping bookings perfectly!");
      } else {
        console.log("❌ CASE 2 FAILED: Conflict detection bypassed due to concurrent timing.");
      }

      // Cleanup
      server.close(() => {
        console.log("\n[Bootstrap] Testing server stopped.");
        db.destroy().then(() => {
          console.log("[Bootstrap] Database connection destroyed.");
          console.log("\n====================================================");
          console.log("       CONCURRENCY BENCHMARK RUN COMPLETE           ");
          console.log("====================================================\n");
          process.exit(
            successes.length === 1 &&
              capacityBlocks.length === 9 &&
              charlieSuccess.length === 1 &&
              charlieConflict.length === 1
              ? 0
              : 1
          );
        });
      });
    } catch (err) {
      console.error("Critical error in concurrency test execution:", err);
      process.exit(1);
    }
  });
}

runConcurrencyTests();
