import { defineConfig } from "tsdown";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    server: "src/server.ts",
    shared: "src/shared.ts",
    cli: "src/cli/index.ts",
  },
  format: "esm",
  platform: "node",
  dts: true,
  clean: true,
});
