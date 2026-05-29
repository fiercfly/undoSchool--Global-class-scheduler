import app from "./app";
import db from "./database/connection";
import dotenv from "dotenv";
import path from "path";
import { CustomMigrationSource } from "./database/migrationSource";

dotenv.config();

const PORT = process.env.PORT || 3000;

async function bootstrap() {
  try {
    console.log("[Bootstrap] Checking database connection and status...");

    // 1. Run migrations automatically on startup
    console.log("[Bootstrap] Running database migrations...");
    const migrationsDir = path.join(__dirname, "database", "migrations");
    await db.migrate.latest({
      migrationSource: new CustomMigrationSource(db, migrationsDir)
    });
    console.log("[Bootstrap] Database migrations applied successfully.");

    // 2. Check if database needs seeding
    const teachersCountRes = await db("teachers").count({ count: "*" }).first();
    const teachersCount = Number(teachersCountRes?.count || 0);

    if (teachersCount === 0) {
      console.log("[Bootstrap] Database is empty. Running seed scripts...");
      await db.seed.run();
      console.log("[Bootstrap] Database seeded successfully.");
    } else {
      console.log("[Bootstrap] Database already contains records. Skipping seeds.");
    }

    // 3. Start Express server
    app.listen(PORT, () => {
      console.log("====================================================");
      console.log(` SERVER RUNNING ON PORT: http://localhost:${PORT}`);
      console.log(` ENVIRONMENT:            ${process.env.NODE_ENV || "development"}`);
      console.log("====================================================");
    });
  } catch (err) {
    console.error("[Bootstrap] Critical failure during server startup:", err);
    process.exit(1);
  }
}

bootstrap();
