import type {
  MightyDevOptions,
  MightyMiddlewareServer,
  MightyServer,
} from "@/types";
import { serveHonoApp } from "../runtime";
import { createDevHonoApp } from "./app";

export async function dev(options?: MightyDevOptions): Promise<MightyServer> {
  const { middlewareMode, ...serverOptions } = options ?? {};

  const { app, viteServer } = await createDevHonoApp(serverOptions);

  if (middlewareMode) {
    return {
      honoApp: app,
      stop: async () => {
        await viteServer.close();
      },
    } satisfies MightyMiddlewareServer;
  }

  const mightyServer = serveHonoApp(app, viteServer);

  return mightyServer;
}
