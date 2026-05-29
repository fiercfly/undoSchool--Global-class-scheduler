import type { Knex } from "knex";
import { randomUUID } from "crypto";

export async function seed(knex: Knex): Promise<void> {
  // Deletes ALL existing entries in dependent tables first
  await knex("bookings").del();
  await knex("sessions").del();
  await knex("offerings").del();
  await knex("parents").del();
  await knex("teachers").del();
  await knex("courses").del();

  // 1. Seed Courses
  const pythonCourseId = randomUUID();
  const artCourseId = randomUUID();
  await knex("courses").insert([
    {
      id: pythonCourseId,
      title: "Python Coding",
      description: "Introductory course to Python programming concepts, variables, and logic.",
    },
    {
      id: artCourseId,
      title: "Art Drawing Class",
      description: "Explore sketching, coloring, and essential drawing techniques.",
    },
  ]);

  // 2. Seed Teachers
  const teacherAliceId = randomUUID(); // Alice
  const teacherBobId = randomUUID();   // Bob
  await knex("teachers").insert([
    {
      id: teacherAliceId,
      name: "Alice Smith",
      email: "alice@example.com",
    },
    {
      id: teacherBobId,
      name: "Bob Jones",
      email: "bob@example.com",
    },
  ]);

  // 3. Seed Parents
  const parentsToInsert = [
    { id: randomUUID(), name: "Charlie Brown", email: "charlie@example.com" },
    { id: randomUUID(), name: "Dana Scully", email: "dana@example.com" },
    { id: randomUUID(), name: "Fox Mulder", email: "mulder@example.com" },
    { id: randomUUID(), name: "Sherlock Holmes", email: "sherlock@example.com" },
    { id: randomUUID(), name: "John Watson", email: "watson@example.com" },
    { id: randomUUID(), name: "Bruce Wayne", email: "bruce@example.com" },
    { id: randomUUID(), name: "Clark Kent", email: "clark@example.com" },
    { id: randomUUID(), name: "Lois Lane", email: "lois@example.com" },
    { id: randomUUID(), name: "Diana Prince", email: "diana@example.com" },
    { id: randomUUID(), name: "Peter Parker", email: "peter@example.com" },
  ];
  await knex("parents").insert(parentsToInsert);

  // Output seed IDs to console so developers can easily run manual tests
  console.log("---------------- DATABASE SEED COMPLETED ----------------");
  console.log(`[Python Course ID]: ${pythonCourseId}`);
  console.log(`[Art Course ID]:    ${artCourseId}`);
  console.log(`[Teacher Alice ID]: ${teacherAliceId}`);
  console.log(`[Teacher Bob ID]:   ${teacherBobId}`);
  console.log(`[Parent Charlie ID]:${parentsToInsert[0].id}`);
  console.log(`[Parent Dana ID]:   ${parentsToInsert[1].id}`);
  console.log("---------------------------------------------------------");
}
