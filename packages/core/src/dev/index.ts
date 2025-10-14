import { getCurrentRuntime, serveHonoApp } from "@/runtime";
import type {
  MightyDevMiddleware,
  MightyDevOptions,
  MightyServer,
} from "@/types";
import { createDevHonoApp } from "./app";
import { setupDev } from "./setup";

export async function dev(
  options?: MightyDevOptions,
): Promise<MightyServer | MightyDevMiddleware> {
  if (getCurrentRuntime() === "workerd") {
    throw new Error("Dev mode is not supported in Cloudflare Workers");
  }
  const { middlewareMode, ...serverOptions } = options ?? {};

  if (middlewareMode) {
    return setupDev({
      options: serverOptions,
      getAddress: middlewareMode.getAddress,
    });
  }

  const { app, stop } = await createDevHonoApp(serverOptions);

  const mightyServer = serveHonoApp(app, stop);

  return mightyServer;
}
