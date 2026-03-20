import { type MightyStartOptions, start } from "@gomighty/core";
import { mergeConfig } from "astro/config";
import { createMiddleware } from "hono/factory";
import type { UnofficialStatusCode } from "hono/utils/http-status";
import type { MightyMiddlewareHandler } from "./types";

export function startMiddleware(
  options?: MightyStartOptions,
): MightyMiddlewareHandler {
  const mightyConfig: MightyStartOptions = {
    config: mergeConfig({ root: "./astro" }, options?.config ?? {}),
  };

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
