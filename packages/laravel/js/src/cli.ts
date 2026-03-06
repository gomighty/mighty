import { build } from "@gomighty/core/build";
import { startSidecar } from "./index";

function parseArgs(argv: string[]): Record<string, string> {
  const args: Record<string, string> = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg?.startsWith("--")) {
      const key = arg.slice(2);
      const next = argv[i + 1];
      if (next && !next.startsWith("--")) {
        args[key] = next;
        i++;
      } else {
        args[key] = "true";
      }
    }
  }
  return args;
}

const [command] = process.argv.slice(2);
const args = parseArgs(process.argv.slice(3));
const port = args.port ? Number.parseInt(args.port, 10) : 5174;
const root = args.root ?? "./resources/astro";

switch (command) {
  case "dev":
    // biome-ignore lint/complexity/useLiteralKeys: https://github.com/oven-sh/bun/issues/20183
    process.env["NODE_ENV"] = "development";
    await startSidecar({ port, config: { root } });
    break;
  case "build":
    await build({ config: { root } });
    break;
  case "start":
    await startSidecar({ port, config: { root } });
    break;
  default:
    console.error(
      `Unknown command: ${command}. Available commands: dev, build, start`,
    );
    process.exit(1);
}
