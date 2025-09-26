import type { AddressInfo } from "node:net";
import { serve } from "@hono/node-server";
import type { Context, Hono } from "hono";
import type { ConnInfo } from "hono/conninfo";
import type { ViteDevServer } from "vite";
import type { MightyServer } from "@/types";

/**
 * Runtime types based on WinterCG runtime keys.
 * @see https://runtime-keys.proposal.wintercg.org/
 */
type Runtime = "bun" | "node" | "workerd";

function isRunningInBun() {
  return (
    typeof navigator !== "undefined" &&
    typeof navigator.userAgent === "string" &&
    navigator.userAgent.startsWith("Bun")
  );
}

function isRunningInWorkerd() {
  return (
    typeof navigator !== "undefined" &&
    typeof navigator.userAgent === "string" &&
    navigator.userAgent.startsWith("Cloudflare-Workers")
  );
}

function serveHonoAppWithBun(app: Hono, viteServer?: ViteDevServer) {
  const server = Bun.serve({ fetch: app.fetch });
  return {
    address: {
      address: server.url.hostname,
      family: "IPv4",
      port: Number(server.url.port),
    },
    stop: async () => {
      await server.stop();
      await viteServer?.close();
    },
  };
}

function serveHonoAppWithNode(app: Hono, viteServer?: ViteDevServer) {
  const server = serve(app);
  return {
    address: server.address() as AddressInfo,
    stop: async () => {
      await new Promise((resolve) => server.close(resolve));
      await viteServer?.close();
    },
  };
}

export function getCurrentRuntime(): Runtime {
  if (isRunningInBun()) return "bun";
  if (isRunningInWorkerd()) return "workerd";
  return "node";
}

export function serveHonoApp(
  app: Hono,
  viteServer?: ViteDevServer,
): MightyServer {
  switch (getCurrentRuntime()) {
    case "bun":
      return { ...serveHonoAppWithBun(app, viteServer), honoApp: app };
    case "node":
      return { ...serveHonoAppWithNode(app, viteServer), honoApp: app };
    case "workerd":
      return { stop: async () => {}, honoApp: app };
  }
}

export async function getRuntimeConnInfo(c: Context): Promise<ConnInfo> {
  switch (getCurrentRuntime()) {
    case "bun": {
      const getConnInfo = (await import("hono/bun")).getConnInfo;
      return getConnInfo(c);
    }
    case "node": {
      const getConnInfo = (await import("@hono/node-server/conninfo"))
        .getConnInfo;
      return getConnInfo(c);
    }
    case "workerd": {
      const getConnInfo = (await import("hono/cloudflare-workers")).getConnInfo;
      return getConnInfo(c);
    }
  }
}
