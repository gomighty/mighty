import type { AddressInfo } from "node:net";
import { serveHonoApp } from "../runtime";
import type { MightyServer, MightyServerOptions } from "../types";
import { createDevHonoApp } from "./app";

let hostAddress: AddressInfo;

export async function dev(
  options?: MightyServerOptions,
): Promise<MightyServer> {
  const { app, viteServer } = await createDevHonoApp(options ?? {}, () => {
    return `http://${hostAddress.address}:${hostAddress.port}`;
  });

  const mightyServer = serveHonoApp(app, viteServer);
  hostAddress = mightyServer.address;

  return mightyServer;
}
