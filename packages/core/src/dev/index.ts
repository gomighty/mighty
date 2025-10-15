import type { MightyDevMiddleware, MightyDevOptions } from "@/types";
import { setupDev } from "./setup";

export async function dev(
  options: MightyDevOptions,
): Promise<MightyDevMiddleware> {
  return setupDev(options);
}
