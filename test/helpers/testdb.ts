import os from "node:os";
import path from "node:path";
import fs from "node:fs";

// Must be called at the top of a test file, before importing lib/db or any
// repository, so the shared connection opens against a throwaway database.
export function useTempDb(): string {
  const p = path.join(
    fs.mkdtempSync(path.join(os.tmpdir(), "sad-test-")),
    "test.db",
  );
  process.env.DB_PATH = p;
  return p;
}
