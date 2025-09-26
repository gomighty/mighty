import type { MiddlewareHandler } from "hono";
import { getCurrentRuntime } from "@/runtime";
import type { MightyServerOptions } from "@/types";
import { getBuildPathsFromInlineConfig } from "@/utils/getBuildPathsFromInlineConfig";

export async function getRuntimeSpecificServeStatic(
  options?: MightyServerOptions,
): Promise<MiddlewareHandler> {
  const runtime = getCurrentRuntime();

  if (runtime === "workerd") {
    // We assume the Cloudflare Worker is already configured to serve static files
    return (_, next) => next();
  }

  const { buildClientPath } = getBuildPathsFromInlineConfig(
    options?.config ?? {},
  );

  if (runtime === "bun") {
    const { serveStatic } = await import("hono/bun");
    return serveStatic({ root: buildClientPath });
  }

  if (runtime === "node") {
    const { serveStatic } = await import("@hono/node-server/serve-static");
    return serveStatic({ root: buildClientPath });
  }

  throw new Error("Unsupported runtime");
}
