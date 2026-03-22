import { dev } from "@gomighty/core";
import type { AstroInlineConfig } from "astro";
import { createMiddleware } from "hono/factory";
import type { UnofficialStatusCode } from "hono/utils/http-status";
import { getCoreOptions } from "./options";
import type { MightyHonoOptions, MightyMiddlewareHandler } from "./types";
import { runConnectMiddleware } from "./utils/runConnectMiddleware.ts";

const MIGHTY_DEV_ROOT = "/__MIGHTY_DEV_ADDRESS__";

export function devMiddleware(
  options?: MightyHonoOptions,
): MightyMiddlewareHandler {
  const mightyConfig = getCoreOptions({
    ...options,
    config: {
      ...options?.config,
      vite: mergeDevViteConfig(options?.config?.vite),
    },
  });

  const setupDevPromise = dev(mightyConfig);

  const middleware = createMiddleware(async (c, next) => {
    const { render, viteMiddleware } = await setupDevPromise;

    if (
      c.req.method === "GET" &&
      (c.req.path.includes(MIGHTY_DEV_ROOT) ||
        c.req.path === "/__open-in-editor")
    ) {
      return runConnectMiddleware(viteMiddleware, c);
    }

    const address = new URL(
      MIGHTY_DEV_ROOT,
      new URL(c.req.url).origin,
    ).toString();
    const sharedData: Record<string, unknown> = {};

    c.setRenderer(async (req) => {
      const response = await render({ ...req, context: sharedData, address });
      return c.html(response.content, response.status as UnofficialStatusCode);
    });

    c.set("share", (dataToShare: Record<string, unknown>) => {
      Object.assign(sharedData, dataToShare);
    });

    await next();
  }) as MightyMiddlewareHandler;

  middleware.stop = async () => {
    const { stop } = await setupDevPromise;
    await stop();
  };

  return middleware;
}

function mergeDevViteConfig(
  viteConfig: AstroInlineConfig["vite"],
): AstroInlineConfig["vite"] {
  return {
    ...viteConfig,
    base: MIGHTY_DEV_ROOT,
  };
}
