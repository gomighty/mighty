import { defineConfig } from "tsdown";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    "dev/index": "src/dev/index.ts",
    "context/index": "src/context/index.ts",
    "start/index": "src/start/index.ts",
    "build/index": "src/build/index.ts",
    types: "src/types.ts",
  },
  format: "esm",
  platform: "node",
  dts: true,
  clean: true,
  copy: [
    { from: "src/build/server-entrypoint.mjs", to: "dist/build" },
    { from: "src/dev/render-vite.ts", to: "dist/dev" },
    {
      from: "src/dev/components/error-page/*",
      to: "dist/dev/components/error-page",
    },
  ],
});
