import type { MightyServerOptions } from "@gomighty/core";
import { devMiddleware } from "./dev";
import { startMiddleware } from "./start";
import type { MightyMiddlewareHandler } from "./types";

export function mighty(options?: MightyServerOptions): MightyMiddlewareHandler {
  if (process.env.NODE_ENV === "development") {
    return devMiddleware(options);
  }
  return startMiddleware(options);
}
