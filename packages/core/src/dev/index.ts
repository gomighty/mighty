import type { AddressInfo } from "node:net";
import { serveHonoApp } from "../runtime";
import type { MightyServer, MightyServerOptions } from "../types";
import { createDevHonoApp } from "./app";

export async function dev(
  options?: MightyServerOptions,
): Promise<MightyServer> {
  // biome-ignore lint/style/useConst: we can't use const because we need to assign the variable later
  let hostAddress: AddressInfo;

  const { app, viteServer } = await createDevHonoApp(options ?? {}, () => {
    return `http://${hostAddress.address}:${hostAddress.port}`;
  });

  const mightyServer = serveHonoApp(app, viteServer);
  hostAddress = mightyServer.address;

  return mightyServer;
}
