import type { MightyServerOptions } from "@gomighty/core";
import { devMiddleware } from "./dev";
import { startMiddleware } from "./start";
import type { StartMightyServerMiddlewareHandler } from "./types";

export function startMightyServer(
  options?: MightyServerOptions,
): StartMightyServerMiddlewareHandler {
  if (process.env.NODE_ENV === "development") {
    return devMiddleware(options);
  }
  return startMiddleware(options);
}
