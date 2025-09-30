import path from "node:path";
import type { AstroInlineConfig } from "astro";

/**
 * Get server and client build paths from an Astro inline config.
 *
 * This function is useful in environments where we cannot resolve the Astro config, e.g. in Cloudflare Workers.
 */
export function getBuildPathsFromInlineConfig(config: AstroInlineConfig): {
  outDirPath: string;
  buildServerPath: string;
  buildClientPath: string;
} {
  const outDirPath = config?.outDir ?? path.join(config?.root ?? ".", "dist");

  return {
    outDirPath,
    buildServerPath: config?.build?.server ?? path.join(outDirPath, "server"),
    buildClientPath: config?.build?.client ?? path.join(outDirPath, "client"),
  };
}
