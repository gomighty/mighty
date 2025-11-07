import type { MightyStartMiddleware, MightyStartOptions } from "@/types";
import { setupStart } from "./setup";

/**
 * Returns a render function that can be used to render Astro components in production.
 *
 * This will throw an error if the project has not been built yet.
 */
export async function start(
  options?: MightyStartOptions,
): Promise<MightyStartMiddleware> {
  return setupStart(options ?? {});
}
