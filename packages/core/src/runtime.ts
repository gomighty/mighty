import type { AddressInfo } from "node:net";
import { serve } from "@hono/node-server";
import type { Hono } from "hono";
import type { ViteDevServer } from "vite";
import type { MightyServer } from "@/types";

type Runtime = "bun" | "node";

export function isRunningInBun() {
  return typeof Bun !== "undefined";
}

export function serveHonoAppWithBun(
  app: Hono,
  viteServer: ViteDevServer,
): MightyServer {
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

export function serveHonoAppWithNode(
  app: Hono,
  viteServer: ViteDevServer,
): MightyServer {
  const server = serve(app);
  return {
    address: server.address() as AddressInfo,
    stop: async () => {
      await new Promise((resolve) => server.close(resolve));
      await viteServer.close();
    },
  };
}

export function getCurrentRuntime(): Runtime {
  if (isRunningInBun()) return "bun";
  return "node";
}

export function serveHonoApp(
  app: Hono,
  viteServer: ViteDevServer,
): MightyServer {
  switch (getCurrentRuntime()) {
    case "bun":
      return serveHonoAppWithBun(app, viteServer);
    case "node":
      return serveHonoAppWithNode(app, viteServer);
  }
}
