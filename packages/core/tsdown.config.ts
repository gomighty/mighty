import { copyFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "tsdown";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const FILES_TO_COPY = [
  "src/build/server-entrypoint.mjs",
  "src/dev/render-vite.ts",
  "src/dev/components/error-page/ErrorPage.astro",
  "src/dev/components/error-page/ErrorDisplay.astro",
  "src/dev/components/error-page/Header.astro",
  "src/dev/components/error-page/DarkModeIcon.astro",
  "src/dev/components/error-page/LightModeIcon.astro",
  "src/dev/components/error-page/MightyLogo.astro",
  "src/dev/components/error-page/types.ts",
];

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
  hooks: {
    "build:done": async () => {
      await Promise.all(
        FILES_TO_COPY.map(async (source) => {
          const src = path.join(__dirname, source);
          const dest = path.join(
            __dirname,
            "dist",
            source.slice("src/".length),
          );
          await mkdir(path.dirname(dest), { recursive: true });
          await copyFile(src, dest);
        }),
      );
    },
  },
});
