#!/usr/bin/env node
import { build } from "@gomighty/core";
import { mergeConfig } from "astro/config";

const command = process.argv[2];

if (command === "build") {
  await build({
    config: mergeConfig({ root: "./astro" }, {}),
  });
} else {
  console.error(
    command
      ? `Unknown command: ${command}. Available commands: build`
      : "Usage: mighty-hono <command>\n\nAvailable commands:\n  build  Build optimized Astro components for production",
  );
  process.exit(1);
}
