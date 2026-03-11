import path from "node:path";
import { fileURLToPath } from "node:url";
import type { DevEnvironment } from "vite";

/**
 * Resolve a module specifier to a Vite-servable URL path.
 *
 * Replicated from Astro's internal `resolveIdToUrl`:
 * https://github.com/withastro/astro/blob/astro%406.0.0-beta.17/packages/astro/src/core/viteUtils.ts
 */

const VALID_ID_PREFIX = "/@id/";

const isWindows = process.platform === "win32";
function normalizePath(id: string): string {
  return path.posix.normalize(isWindows ? id.replace(/\\/g, "/") : id);
}

export async function resolveIdToUrl(
  ssrEnvironment: DevEnvironment,
  id: string,
  root?: URL,
): Promise<string> {
  let result = await ssrEnvironment.pluginContainer.resolveId(id, undefined);

  if (!result && id.endsWith(".jsx")) {
    result = await ssrEnvironment.pluginContainer.resolveId(
      id.slice(0, -4),
      undefined,
    );
  }

  if (!result) {
    return VALID_ID_PREFIX + id;
  }

  const resultId = result.id;

  if (path.isAbsolute(resultId)) {
    const normalizedRoot = root && normalizePath(fileURLToPath(root));
    if (normalizedRoot && resultId.startsWith(normalizedRoot)) {
      return resultId.slice(normalizedRoot.length - 1);
    }
    return `/@fs${resultId.startsWith("/") ? "" : "/"}${resultId}`;
  }

  return VALID_ID_PREFIX + resultId;
}
