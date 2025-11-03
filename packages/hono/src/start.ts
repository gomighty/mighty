import {
  type MightyStartOptions,
  start,
} from "@gomighty/core";
import { createMiddleware } from "hono/factory";
import type { UnofficialStatusCode } from "hono/utils/http-status";
import type { StartMightyServerMiddlewareHandler } from "./types";

export function startMiddleware(): StartMightyServerMiddlewareHandler {
  const mightyConfig: MightyStartOptions = {
    config: {
      root: "./astro",
    },
  };

  const setupStartPromise = start(mightyConfig);

  const sharedData: Record<string, unknown> = {};

  return createMiddleware(async (c, next) => {
    const { render } = await setupStartPromise;

    c.setRenderer(async (req) => {
      const response = await render(req);
      if ("redirectTo" in response) {
        return c.redirect(response.redirectTo);
      }
      return c.html(response.content, response.status as UnofficialStatusCode);
    })

    c.set("shareWithAstroComponent", (dataToShare: Record<string, unknown>) => {
      Object.assign(sharedData, dataToShare);
    });

    await next();
  });
}
