import { serveHonoApp } from "@/runtime";
import type {
  MightyServer,
  MightyStartMiddleware,
  MightyStartOptions,
} from "@/types";
import { createProdHonoApp } from "./app";
import { setupStart } from "./setup";

export async function start(
  options?: MightyStartOptions,
): Promise<MightyServer | MightyStartMiddleware> {
  const { middlewareMode, ...serverOptions } = options ?? {};

  if (middlewareMode) {
    return setupStart({
      options: serverOptions,
    });
  }

  const { app } = await createProdHonoApp(serverOptions);

  return serveHonoApp(app);
}
