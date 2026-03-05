import type { MightyServerOptions } from "@gomighty/core";
import { devMiddleware } from "./dev";
import { startMiddleware } from "./start";
import type { StartMightyServerMiddlewareHandler } from "./types";

export function startMightyServer(
  options?: MightyServerOptions,
): StartMightyServerMiddlewareHandler {
  // biome-ignore lint/complexity/useLiteralKeys: https://github.com/oven-sh/bun/issues/20183
  if (process.env["NODE_ENV"] === "development") {
    return devMiddleware(options);
  }
  return startMiddleware(options);
}
