import { defineConfig } from "tsdown";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    server: "src/server.ts",
  },
  format: "esm",
  platform: "node",
  dts: true,
  clean: true,
});
