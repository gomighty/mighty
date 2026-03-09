import { parseArgs } from "node:util";
import { build } from "@gomighty/core/build";
import { startSidecar } from "./index";

const { values, positionals } = parseArgs({
  args: process.argv.slice(2),
  options: {
    port: { type: "string" },
    root: { type: "string" },
  },
  allowPositionals: true,
});

const [command] = positionals;
const port = values.port ? Number.parseInt(values.port, 10) : 5174;
const root = values.root ?? "./resources/astro";

switch (command) {
  case "dev":
    process.env.NODE_ENV = "development";
    await startSidecar({ port, config: { root } });
    break;
  case "build":
    await build({ config: { root } });
    break;
  case "start":
    process.env.NODE_ENV = "production";
    await startSidecar({ port, config: { root } });
    break;
  default:
    console.error(
      `Unknown command: ${command}. Available commands: dev, build, start`,
    );
    process.exit(1);
}
