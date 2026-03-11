import { defineConfig } from "tsdown";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    cli: "src/cli.ts",
    context: "src/context.ts",
  },
  format: "esm",
  platform: "node",
  dts: true,
  clean: true,
  splitting: false,
  copy: [{ from: "src/components/*", to: "dist/components" }],
});
