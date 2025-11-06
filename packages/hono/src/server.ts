import { devMiddleware } from "./dev";
import { startMiddleware } from "./start";
import type { StartMightyServerMiddlewareHandler } from "./types";

export function startMightyServer(): StartMightyServerMiddlewareHandler {
  // biome-ignore lint/complexity/useLiteralKeys: https://github.com/oven-sh/bun/issues/20183
  if (process.env["NODE_ENV"] === "development") {
    return devMiddleware();
  }
  return startMiddleware();
}
