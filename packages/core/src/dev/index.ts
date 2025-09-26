import { getCurrentRuntime, serveHonoApp } from "@/runtime";
import type { MightyDevAndStartOptions, MightyServer } from "@/types";
import { createDevHonoApp } from "./app";

export async function dev(
  options?: MightyDevAndStartOptions,
): Promise<MightyServer> {
  if (getCurrentRuntime() === "workerd") {
    throw new Error("Dev mode is not supported in Cloudflare Workers");
  }

  const { middlewareMode, ...serverOptions } = options ?? {};

  const { app, viteServer } = await createDevHonoApp(serverOptions);

  if (middlewareMode) {
    return {
      honoApp: app,
      stop: async () => {
        await viteServer.close();
      },
    };
  }

  const mightyServer = serveHonoApp(app, viteServer);

  return mightyServer;
}
