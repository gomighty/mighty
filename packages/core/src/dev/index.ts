import type { MightyDevMiddleware, MightyServerOptions } from "@/types";
import { setupDev } from "./setup";

/**
 * Starts the Mighty development server.
 */
export async function dev(
  options: MightyServerOptions,
): Promise<MightyDevMiddleware> {
  return setupDev(options);
}
