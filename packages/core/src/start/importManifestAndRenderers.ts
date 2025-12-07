import path from "node:path";
import type { AstroInlineConfig, SSRLoadedRenderer, SSRManifest } from "astro";
import { getBuildPathsFromInlineConfig } from "@/utils/getBuildPathsFromInlineConfig";

/**
 * Import the manifest and renderers from the Astro build.
 *
 * HACK: We invalidate import caching for both the manifest and renderers,
 * so that tests expecting different manifests do not fail here.
 */
export async function importManifestAndRenderers(
  config: AstroInlineConfig,
): Promise<{ manifest: SSRManifest; renderers: SSRLoadedRenderer[] }> {
  const { buildServerPath } = getBuildPathsFromInlineConfig(config);

  try {
    const [manifest, renderers] = await Promise.all([
      import(
        path.join(buildServerPath, `entry.mjs?invalidateCache=${Math.random()}`)
      ).then((module) => module.manifest),
      import(
        path.join(
          buildServerPath,
          `renderers.mjs?invalidateCache=${Math.random()}`,
        )
      ).then((module) => module.renderers),
    ]);
    return { manifest, renderers };
  } catch (_) {
    throw new Error(
      "Failed to load manifest file and/or renderers. Did you build your project?",
    );
  }
}
