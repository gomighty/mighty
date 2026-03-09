import { dev, type MightyDevOptions } from "@gomighty/core";
import { mergeConfig } from "astro/config";
import { createMiddleware } from "hono/factory";
import type { UnofficialStatusCode } from "hono/utils/http-status";
import type { StartMightyServerMiddlewareHandler } from "./types";
import { runConnectMiddleware } from "./utils/runConnectMiddleware.ts";

const MIGHTY_DEV_ROOT = "/__MIGHTY_DEV_ADDRESS__";

export function devMiddleware(
  options?: Omit<MightyDevOptions, "getAddress">,
): StartMightyServerMiddlewareHandler {
  let rootAddress: string = "";
  const mightyConfig: MightyDevOptions = {
    ...options,
    config: mergeConfig(
      { root: "./astro", vite: { base: MIGHTY_DEV_ROOT } },
      options?.config ?? {},
    ),
    getAddress: () => new URL(MIGHTY_DEV_ROOT, rootAddress).toString(),
  };

  const setupDevPromise = dev(mightyConfig);

  return createMiddleware(async (c, next) => {
    const { render, viteMiddleware } = await setupDevPromise;

    if (!rootAddress) {
      rootAddress = new URL(c.req.url).origin;
    }

    if (c.req.method === "GET" && c.req.path.includes(MIGHTY_DEV_ROOT)) {
      return runConnectMiddleware(viteMiddleware, c);
    }

    const sharedData: Record<string, unknown> = {};

    c.setRenderer(async (req) => {
      const response = await render({ ...req, context: { ...sharedData } });
      return c.html(response.content, response.status as UnofficialStatusCode);
    });

    c.set("shareWithAstroComponent", (dataToShare: Record<string, unknown>) => {
      Object.assign(sharedData, dataToShare);
    });

    await next();
  });
}
