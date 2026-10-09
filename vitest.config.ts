import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    // Mirror tsconfig "@/*" -> "./*" so API route handlers (which import via
    // "@/lib/...") can be imported directly from tests.
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
  test: {
    environment: "node",
    include: ["test/**/*.test.ts"],
  },
});
