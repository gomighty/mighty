#!/usr/bin/env node
import { runCli } from "./run";

try {
  await runCli(process.argv.slice(2));
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
