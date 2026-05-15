import { existsSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const { DatabaseSync } = require("node:sqlite") as typeof import("node:sqlite");

export type SqliteDB = InstanceType<typeof DatabaseSync>;

export function migrate(db: SqliteDB) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `);
}

export function openDb(databasePath: string): SqliteDB {
  if (databasePath !== ":memory:") {
    const dir = dirname(databasePath);
    if (dir && dir !== "." && !existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
  }
  const db = new DatabaseSync(databasePath);
  migrate(db);
  return db;
}

export function defaultDatabasePath(): string {
  return process.env.DATABASE_PATH ?? join(dirname(fileURLToPath(import.meta.url)), "../data/app.db");
}
