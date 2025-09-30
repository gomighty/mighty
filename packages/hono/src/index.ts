import {
  dev,
  type MightyDevAndStartOptions,
  type MightyServer,
  start,
} from "@gomighty/core";
import type { MiddlewareHandler } from "hono";

export function startServer(): MiddlewareHandler<{
  Variables: {
    __mightyServer_: MightyServer;
  };
}> {
  const mightyConfig: MightyDevAndStartOptions = {
    middlewareMode: true,
    config: {
      root: "./astro",
    },
  };

  const serverPromise =
    process.env.NODE_ENV === "development"
      ? dev(mightyConfig)
      : start(mightyConfig);

  return async (c, next) => {
    c.set("__mightyServer_", await serverPromise);
    return next();
  };
}
