import { readFileSync, readdirSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import Database from "better-sqlite3";

const MIGRATIONS = join(process.cwd(), "lib/migrations");

let db: Database.Database | undefined;

export function getDb(): Database.Database {
  if (db) return db;

  const path = process.env.DB_PATH ?? "./data/app.db";
  mkdirSync(dirname(path), { recursive: true });

  db = new Database(path);
  db.pragma("journal_mode = WAL");

  // Every migration is written `if not exists`, so re-running the set on each
  // boot is a no-op. The runtime image has no CLI to run migrations with.
  for (const file of readdirSync(MIGRATIONS).sort()) {
    if (file.endsWith(".sql")) {
      db.exec(readFileSync(join(MIGRATIONS, file), "utf8"));
    }
  }

  return db;
}
