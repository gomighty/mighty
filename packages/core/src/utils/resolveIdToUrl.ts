import path from "node:path";
import { fileURLToPath } from "node:url";
import type { DevEnvironment } from "vite";

export async function resolveIdToUrl(
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
