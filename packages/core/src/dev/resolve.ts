import path from "node:path";
import { fileURLToPath } from "node:url";
import type { DevEnvironment } from "vite";

/**
 * Creates the `resolve` callback passed to AstroContainer.
 *
 * Translates import specifiers (e.g. `@astrojs/react/client.js`) into
 * fully-qualified Vite dev-server URLs the browser can fetch.
 */
export function createResolve(
  getAddress: () => string,
  ssrEnvironment: DevEnvironment,
  root: URL,
): (s: string) => Promise<string> {
  return async (s: string) => {
    const address = getAddress();
    if (s.startsWith("astro:scripts")) {
      return `${address}/@id/${s}`;
    }
    if (s.startsWith("/@id")) {
      return `${address}${s}`;
    }
    const resolved = await resolveIdToUrl(ssrEnvironment, s, root);
    return `${address}${resolved}`;
  };
}

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
