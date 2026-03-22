import path from "node:path";
import type { AstroInlineConfig, SSRManifest } from "astro";
import type { AstroComponentFactory } from "astro/runtime/server/index.js";
import { getBuildPathsFromInlineConfig } from "@/utils/getBuildPathsFromInlineConfig";

const LEGACY_PAGE_MODULE_PREFIX = "\u0000virtual:astro:page:";
const LEGACY_PAGE_MODULE_SUFFIX = "@_@astro";

export type BuiltPageModule = {
  page: () => Promise<{
    default: AstroComponentFactory;
  }>;
};

/**
 * Import the manifest from the Astro build output.
 *
 * Cache-busting is used here because the test suite intentionally builds
 * multiple fixtures with different manifests in one process.
 */
export async function loadBuildManifest(
  config: AstroInlineConfig,
): Promise<SSRManifest> {
  const { buildServerPath } = getBuildPathsFromInlineConfig(config);

  try {
    const entryModule = await import(
      path.join(buildServerPath, `entry.mjs?invalidateCache=${Math.random()}`)
    );

    return entryModule.manifest as SSRManifest;
  } catch {
    throw new Error("Failed to load Astro build manifest. Did you build?");
  }
}

export async function loadBuiltPageModule(
  manifest: SSRManifest,
  componentPath: string,
): Promise<BuiltPageModule | undefined> {
  const importer = manifest.pageMap?.get(`${componentPath}.astro`);
  if (importer) {
    return (await importer()) as BuiltPageModule;
  }

  const legacyEntryModule =
    manifest.entryModules[
      `${LEGACY_PAGE_MODULE_PREFIX}${componentPath}${LEGACY_PAGE_MODULE_SUFFIX}`
    ];
  if (!legacyEntryModule) {
    return undefined;
  }

  return (await import(
    path.join(manifest.buildServerDir.pathname, legacyEntryModule)
  )) as BuiltPageModule;
}
