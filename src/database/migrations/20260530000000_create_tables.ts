import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  // 1. Courses Table
  await knex.schema.createTable("courses", (table) => {
    table.uuid("id").primary();
    table.string("title").notNullable();
    table.text("description").nullable();
    table.timestamps(true, true);
  });

  // 2. Teachers Table
  await knex.schema.createTable("teachers", (table) => {
    table.uuid("id").primary();
    table.string("name").notNullable();
    table.string("email").notNullable().unique();
    table.timestamps(true, true);
  });

  // 3. Parents Table
  await knex.schema.createTable("parents", (table) => {
    table.uuid("id").primary();
    table.string("name").notNullable();
    table.string("email").notNullable().unique();
    table.timestamps(true, true);
  });

  // 4. Offerings Table (a section/batch of a course)
  await knex.schema.createTable("offerings", (table) => {
    table.uuid("id").primary();
    table
      .uuid("course_id")
      .notNullable()
      .references("id")
      .inTable("courses")
      .onDelete("CASCADE");
    table
      .uuid("teacher_id")
      .notNullable()
      .references("id")
      .inTable("teachers")
      .onDelete("CASCADE");
    table.string("name").notNullable(); // E.g., "Saturday Batch"
    table.integer("capacity").notNullable().defaultTo(10);
    table.timestamps(true, true);
  });

  // 5. Sessions Table (the actual class timings)
  await knex.schema.createTable("sessions", (table) => {
    table.uuid("id").primary();
    table
      .uuid("offering_id")
      .notNullable()
      .references("id")
      .inTable("offerings")
      .onDelete("CASCADE");
    table
      .uuid("teacher_id")
      .notNullable()
      .references("id")
      .inTable("teachers")
      .onDelete("CASCADE");
    table.timestamp("start_time").notNullable(); // Store UTC ISO strings/timestamp
    table.timestamp("end_time").notNullable();

    // Indexes for fast overlap queries
    table.index("offering_id");
    table.index("teacher_id");
    table.index(["start_time", "end_time"]);
  });

  // 6. Bookings Table (parent registration at offering level)
  await knex.schema.createTable("bookings", (table) => {
    table.uuid("id").primary();
    table
      .uuid("offering_id")
      .notNullable()
      .references("id")
      .inTable("offerings")
      .onDelete("CASCADE");
    table
      .uuid("parent_id")
      .notNullable()
      .references("id")
      .inTable("parents")
      .onDelete("CASCADE");
    table.timestamp("booked_at").notNullable().defaultTo(knex.fn.now());

    // Indexes
    table.index("parent_id");
    table.index("offering_id");

    // A parent can only book the same offering once
    table.unique(["offering_id", "parent_id"]);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("bookings");
  await knex.schema.dropTableIfExists("sessions");
  await knex.schema.dropTableIfExists("offerings");
  await knex.schema.dropTableIfExists("parents");
  await knex.schema.dropTableIfExists("teachers");
  await knex.schema.dropTableIfExists("courses");
}
