import fs from "fs";
import path from "path";
import { Knex } from "knex";

export class CustomMigrationSource implements Knex.MigrationSource<string> {
  private directory: string;
  private knex: Knex;

  constructor(knex: Knex, directory: string) {
    this.knex = knex;
    this.directory = directory;
  }

  async getMigrations(): Promise<string[]> {
    if (!fs.existsSync(this.directory)) {
      return [];
    }

    // 1. Read files from the directory (e.g. ['20260530000000_create_tables.js'])
    const files = fs.readdirSync(this.directory)
      .filter(f => f.endsWith(".js") || f.endsWith(".ts"))
      .sort();

    // 2. Query already executed migrations from the database to see their registered names/extensions
    let dbMigrationNames: string[] = [];
    try {
      const rows = await this.knex("knex_migrations").select("name");
      dbMigrationNames = rows.map((r: any) => r.name);
    } catch (e) {
      // If table doesn't exist yet, it's fine
    }

    // 3. Map files to the name they are registered with in the database, if a base name match exists
    const resolvedMigrations = files.map(file => {
      const ext = path.extname(file); // '.js' or '.ts'
      const base = path.basename(file, ext); // e.g. '20260530000000_create_tables'

      // Check if there is a match in the database with a different extension
      const dbMatch = dbMigrationNames.find(dbName => {
        const dbExt = path.extname(dbName);
        const dbBase = path.basename(dbName, dbExt);
        return dbBase === base;
      });

      if (dbMatch) {
        return dbMatch; // Use the exact name registered in the DB (e.g. '20260530000000_create_tables.ts')
      }

      return file; // Otherwise, use the filename as is
    });

    return resolvedMigrations;
  }

  getMigrationName(migration: string): string {
    return migration;
  }

  async getMigration(migration: string): Promise<any> {
    const ext = path.extname(migration);
    const base = path.basename(migration, ext);

    let filePath = path.join(this.directory, migration);

    if (!fs.existsSync(filePath)) {
      // Try the other extension (fall back to whatever is physically present on disk)
      const otherExt = ext === ".ts" ? ".js" : ".ts";
      const alternativePath = path.join(this.directory, base + otherExt);
      if (fs.existsSync(alternativePath)) {
        filePath = alternativePath;
      }
    }

    // Load the migration module
    const migrationModule = require(filePath);
    return migrationModule.default || migrationModule;
  }
}
