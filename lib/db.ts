import Database from "better-sqlite3";
import path from "node:path";

// Single shared connection. Cached on globalThis so Next.js hot-reload in dev
// doesn't open a new handle on every module reload.
const DB_PATH = process.env.DB_PATH || path.join(process.cwd(), "data.db");

declare global {
  // eslint-disable-next-line no-var
  var __sad_db: Database.Database | undefined;
}

function createDb(): Database.Database {
  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  migrate(db);
  return db;
}

function migrate(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS days (
      date       TEXT PRIMARY KEY,
      pomodoros  INTEGER NOT NULL DEFAULT 0,
      quality    INTEGER,
      review     TEXT,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS weekly_reviews (
      week_start TEXT PRIMARY KEY,
      quality    INTEGER,
      review     TEXT,
      plan       TEXT,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS monthly_reviews (
      month      TEXT PRIMARY KEY,
      quality    INTEGER,
      review     TEXT,
      plan       TEXT,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS settings (
      id         INTEGER PRIMARY KEY CHECK (id = 1),
      daily_goal INTEGER NOT NULL DEFAULT 8
    );

    INSERT OR IGNORE INTO settings (id, daily_goal) VALUES (1, 8);
  `);
}

export function getDb(): Database.Database {
  if (!global.__sad_db) {
    global.__sad_db = createDb();
  }
  return global.__sad_db;
}

export { DB_PATH };
