import { serveHonoApp } from "../runtime";
import type { MightyServer, MightyServerOptions } from "../types";
import { createDevHonoApp } from "./app";

export async function dev(
  options?: MightyServerOptions,
): Promise<MightyServer> {
  const { app, viteServer } = await createDevHonoApp(options);

  return serveHonoApp(app, viteServer);
}
