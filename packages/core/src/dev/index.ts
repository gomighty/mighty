import type { MightyDevMiddleware, MightyDevOptions } from "@/types";
import { setupDev } from "./setup";

/**
 * Starts the Mighty development server.
 */
export async function dev(
  options: MightyDevOptions,
): Promise<MightyDevMiddleware> {
  return setupDev(options);
}
