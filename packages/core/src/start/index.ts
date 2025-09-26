import { serveHonoApp } from "@/runtime";
import type { MightyDevAndStartOptions, MightyServer } from "@/types";
import { createProdHonoApp } from "./app";

export async function start(
  options?: MightyDevAndStartOptions,
): Promise<MightyServer> {
  const { middlewareMode, ...serverOptions } = options ?? {};

  const { app } = await createProdHonoApp(serverOptions);

  if (middlewareMode) {
    return {
      honoApp: app,
      stop: async () => {},
    };
  }

  return serveHonoApp(app);
}
