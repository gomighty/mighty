import { devMiddleware } from "./dev";
import { startMiddleware } from "./start";
import type { StartMightyServerMiddlewareHandler } from "./types";

export function startMightyServer(): StartMightyServerMiddlewareHandler {
  return process.env.NODE_ENV === "development"
    ? devMiddleware()
    : startMiddleware();
}
