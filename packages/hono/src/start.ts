import { start } from "@gomighty/core";
import { createMiddleware } from "hono/factory";
import type { UnofficialStatusCode } from "hono/utils/http-status";
import { getCoreOptions } from "./options";
import type { MightyHonoOptions, MightyMiddlewareHandler } from "./types";

export function startMiddleware(
  options?: MightyHonoOptions,
): MightyMiddlewareHandler {
  const mightyConfig = getCoreOptions(options);

  const setupStartPromise = start(mightyConfig);

  return createMiddleware(async (c, next) => {
    const { render } = await setupStartPromise;
    const sharedData: Record<string, unknown> = {};

    c.setRenderer(async (req) => {
      const response = await render({ ...req, context: sharedData });
      if ("redirectTo" in response) {
        return c.redirect(response.redirectTo);
      }
      return c.html(response.content, response.status as UnofficialStatusCode);
    });

    c.set("share", (dataToShare: Record<string, unknown>) => {
      Object.assign(sharedData, dataToShare);
    });

    await next();
  });
}
