import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    alias: {
      "@/": `${path.resolve(import.meta.dirname, "src")}/`,
      "@tests/": `${path.resolve(import.meta.dirname, "tests")}/`,
    },
    testTimeout: 120000,
    hookTimeout: 60000,
  },
});
