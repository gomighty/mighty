import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    projects: ["packages/*"],
    testTimeout: 120000,
    hookTimeout: 60000,
  },
});
