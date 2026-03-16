import path from "node:path";
import { fileURLToPath } from "node:url";
import type { DevEnvironment } from "vite";
import { MIGHTY_DEV_PLACEHOLDER_ADDRESS } from "./constants";

/**
 * Creates the `resolve` callback passed to AstroContainer.
 *
 * Translates import specifiers (e.g. `@astrojs/react/client.js`) into
 * fully-qualified Vite dev-server URLs the browser can fetch.
 */
export function createResolve(
  ssrEnvironment: DevEnvironment,
  root: URL,
): (s: string) => Promise<string> {
  return async (s: string) => {
    if (s.startsWith("astro:scripts")) {
      return `${MIGHTY_DEV_PLACEHOLDER_ADDRESS}/@id/${s}`;
    }
    if (s.startsWith("/@id")) {
      return `${MIGHTY_DEV_PLACEHOLDER_ADDRESS}${s}`;
    }
    const resolved = await resolveIdToUrl(ssrEnvironment, s, root);
    return `${MIGHTY_DEV_PLACEHOLDER_ADDRESS}${resolved}`;
  };
}

/**
 * Simulate Vite's resolve and import analysis so we can import the id as a URL
 * through a script tag or a dynamic import as-is.
 *
 * Adapted from Astro's `resolveIdToUrl`:
 * https://github.com/withastro/astro/blob/astro%406.0.0-beta.17/packages/astro/src/core/viteUtils.ts#L55-L73
 *
 * Changes from upstream:
 * - Uses Vite's `DevEnvironment.pluginContainer.resolveId()` directly instead
 *   of Astro's `ModuleLoader` abstraction (which wraps the same Vite API).
 * - Reads `resolved.id` from the `ResolvedId` object instead of receiving a
 *   plain string (upstream's `ModuleLoader.resolveId` unwraps it).
 * - Drops the `normalizePath` / `prependForwardSlash` helpers — path handling
 *   is simplified with `path.relative` since we only run on the server.
 */
async function resolveIdToUrl(
  environment: DevEnvironment,
  id: string,
  root?: URL,
): Promise<string> {
  let resolved = await environment.pluginContainer.resolveId(id);

  // If unresolved and ends with .jsx, retry without extension (matching Astro's behavior)
  if (!resolved && id.endsWith(".jsx")) {
    resolved = await environment.pluginContainer.resolveId(id.slice(0, -4));
  }

  if (!resolved) {
    return `/@id/${id}`;
  }

  const resolvedId = resolved.id;

  if (!path.isAbsolute(resolvedId)) {
    return `/@id/${id}`;
  }

  if (root) {
    const rootPath = fileURLToPath(root);
    if (resolvedId.startsWith(rootPath)) {
      return `/${path.relative(rootPath, resolvedId)}`;
    }
  }

  return `/@fs/${resolvedId}`;
}
