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

  db.exec(`
    CREATE TABLE IF NOT EXISTS tasks (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      date       TEXT NOT NULL,
      title      TEXT NOT NULL,
      planned    INTEGER NOT NULL DEFAULT 0,
      actual     INTEGER NOT NULL DEFAULT 0,
      done       INTEGER NOT NULL DEFAULT 0,
      sort_order INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_tasks_date ON tasks(date);
  `);

  // Additive column migrations — idempotent via table_info check. SQLite has
  // no "ADD COLUMN IF NOT EXISTS", so we probe first.
  const addColumn = (table: string, col: string, decl: string) => {
    const existing = (
      db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[]
    ).map((r) => r.name);
    if (!existing.includes(col)) {
      db.exec(`ALTER TABLE ${table} ADD COLUMN ${col} ${decl}`);
    }
  };
  addColumn("days", "mistakes", "TEXT");
  addColumn("days", "wins", "TEXT");
  addColumn("days", "conclusions", "TEXT");
  addColumn("days", "mental", "INTEGER");
  addColumn("days", "mental_note", "TEXT");
  addColumn("days", "social", "INTEGER NOT NULL DEFAULT 0");
  addColumn("days", "plan", "TEXT");
  for (const t of ["weekly_reviews", "monthly_reviews"]) {
    addColumn(t, "mistakes", "TEXT");
    addColumn(t, "wins", "TEXT");
    addColumn(t, "conclusions", "TEXT");
  }
}

export function getDb(): Database.Database {
  if (!global.__sad_db) {
    global.__sad_db = createDb();
  }
  return global.__sad_db;
}

export { DB_PATH };
