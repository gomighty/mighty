import type { MightyServerOptions } from "@gomighty/core";
import type { MightyHonoMode, MightyHonoOptions } from "./types";

export const DEFAULT_ASTRO_ROOT = "./astro";

export function getMode(options?: MightyHonoOptions): MightyHonoMode {
  return (
    options?.mode ??
    (process.env.NODE_ENV === "development" ? "development" : "production")
  );
}

export function getCoreOptions(
  options?: MightyHonoOptions,
): MightyServerOptions {
  const { root = DEFAULT_ASTRO_ROOT, mode: _, ...coreOptions } = options ?? {};
  const { root: configRoot, ...configWithoutRoot } = coreOptions.config ?? {};
  const resolvedRoot = configRoot ?? root;

  return {
    ...coreOptions,
    config: {
      ...configWithoutRoot,
      root: resolvedRoot,
    },
  };
}
