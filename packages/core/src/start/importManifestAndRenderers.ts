import path from "node:path";
import type { AstroInlineConfig, SSRLoadedRenderer, SSRManifest } from "astro";
import { getBuildPathsFromInlineConfig } from "@/utils/getBuildPathsFromInlineConfig";
import { type Result, resultFromAsync } from "@/utils/result";

/**
 * Import the manifest and renderers from the Astro build.
 *
 * HACK: We invalidate import caching for both the manifest and renderers,
 * so that tests expecting different manifests do not fail here.
 */
export async function importManifestAndRenderers(
  config: AstroInlineConfig,
): Promise<
  Result<{
    manifest: SSRManifest;
    renderers: SSRLoadedRenderer[];
  }>
> {
  const { buildServerPath } = getBuildPathsFromInlineConfig(config);

  const { data: manifest, error: manifestError } = await resultFromAsync(
    import(
      path.join(buildServerPath, `entry.mjs?invalidateCache=${Math.random()}`)
    ).then((module) => module.manifest),
  );
  if (manifestError) {
    return { data: null, error: manifestError };
  }

  const { data: renderers, error: renderersError } = await resultFromAsync(
    import(
      path.join(
        buildServerPath,
        `renderers.mjs?invalidateCache=${Math.random()}`,
      )
    ).then((module) => module.renderers),
  );
  if (renderersError) {
    return { data: null, error: renderersError };
  }

  return { data: { manifest, renderers }, error: null };
}
