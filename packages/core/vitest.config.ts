import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    setupFiles: ["./tests/custom-matchers.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@tests": path.resolve(__dirname, "./tests"),
    },
  },
});
