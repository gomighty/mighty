import type { MightyStartMiddleware, MightyStartOptions } from "@/types";
import { setupStart } from "./setup";

export async function start(
  options?: MightyStartOptions,
): Promise<MightyStartMiddleware> {
  return setupStart(options ?? {});
}
