import { parseArgs } from "node:util";
import { build } from "@gomighty/core";

const helpText = `Usage: mighty-hono <command>

Available commands:
  build  Build optimized Astro components for production

  Options:
    --root <path>  Astro root directory (default: ./astro)`;

type CliCommand = "build" | "help";

type CliParseResult =
  | {
      command: CliCommand;
      root: string;
      error?: undefined;
    }
  | {
      command?: undefined;
      root?: undefined;
      error: string;
    };

function parseCliCommand(command: string | undefined): CliCommand {
  if (command === "build") {
    return "build";
  }
  return "help";
}

class CliError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CliError";
  }
}

function parseCliArgs(args: string[]): CliParseResult {
  try {
    const { positionals, values } = parseArgs({
      args,
      allowPositionals: true,
      options: {
        root: {
          type: "string",
          default: "./astro",
        },
      },
      strict: true,
    });

    return {
      command: parseCliCommand(positionals[0]),
      root: values.root,
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function runCli(args: string[]): Promise<void> {
  const { command, root, error } = parseCliArgs(args);

  if (error !== undefined) {
    throw new CliError(`${error}\n\n${helpText}`);
  }

  switch (command) {
    case "build":
      await build({
        config: { root },
      });
      return;
    case "help":
      throw new CliError(helpText);
    default: {
      const _: never = command;
      throw new Error(`Unknown command: ${command}`);
    }
  }
}
