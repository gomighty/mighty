import { devMiddleware } from "./dev";
import { startMiddleware } from "./start";
import type { StartMightyServerMiddlewareHandler } from "./types";

export function startMightyServer(): StartMightyServerMiddlewareHandler {
  if (process.env.NODE_ENV === "development") {
    return devMiddleware();
  }
  return startMiddleware();
}
