import type { AddressInfo } from "node:net";
import { serve } from "@hono/node-server";
import type { Context, Hono } from "hono";
import type { ViteDevServer } from "vite";
import type { MightyStandaloneServer } from "@/types";

type Runtime = "bun" | "node";

export function isRunningInBun() {
  return typeof Bun !== "undefined";
}

function serveHonoAppWithBun(app: Hono, viteServer: ViteDevServer) {
  const server = Bun.serve({ fetch: app.fetch });
  return {
    address: {
      address: server.url.hostname,
      family: "IPv4",
      port: Number(server.url.port),
    },
    stop: async () => {
      await server.stop();
      await viteServer.close();
    },
  };
}

function serveHonoAppWithNode(app: Hono, viteServer: ViteDevServer) {
  const server = serve(app);
  return {
    address: server.address() as AddressInfo,
    stop: async () => {
      await new Promise((resolve) => server.close(resolve));
      await viteServer.close();
    },
  };
}

function getCurrentRuntime(): Runtime {
  if (isRunningInBun()) return "bun";
  return "node";
}

export function serveHonoApp(
  app: Hono,
  viteServer: ViteDevServer,
): MightyStandaloneServer {
  switch (getCurrentRuntime()) {
    case "bun":
      return { ...serveHonoAppWithBun(app, viteServer), honoApp: app };
    case "node":
      return { ...serveHonoAppWithNode(app, viteServer), honoApp: app };
  }
}

export async function getRuntimeConnInfo(c: Context) {
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
  }
}
