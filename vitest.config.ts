import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["packages/core/tests/**/*.test.ts"],
    alias: {
      "@/": `${path.resolve(import.meta.dirname, "packages/core/src")}/`,
      "@tests/": `${path.resolve(import.meta.dirname, "packages/core/tests")}/`,
    },
    testTimeout: 30000,
  },
});
