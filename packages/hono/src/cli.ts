#!/usr/bin/env node
import { build } from "@gomighty/core";

const args = process.argv.slice(2);
const command = args[0];
const rootIndex = args.indexOf("--root");
const root = rootIndex !== -1 ? args[rootIndex + 1] : undefined;

if (command === "build") {
  await build({
    config: { root: root ?? "./astro" },
  });
} else {
  console.error(
    command
      ? `Unknown command: ${command}. Available commands: build`
      : "Usage: mighty-hono <command>\n\nAvailable commands:\n  build  Build optimized Astro components for production\n\nOptions:\n  --root <path>  Astro root directory (default: ./astro)",
  );
  process.exit(1);
}
