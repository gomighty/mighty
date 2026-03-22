import { devMiddleware } from "./dev";
import { getMode } from "./options";
import { startMiddleware } from "./start";
import type { MightyHonoOptions, MightyMiddlewareHandler } from "./types";

export function mighty(options?: MightyHonoOptions): MightyMiddlewareHandler {
  if (getMode(options) === "development") {
    return devMiddleware(options);
  }
  return startMiddleware(options);
}
