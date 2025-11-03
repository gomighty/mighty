import type { AstroIntegration, AstroRenderer, SSRLoadedRenderer } from "astro";
import type { ViteDevServer } from "vite";
import { executeIntegrationsConfigSetup } from "@/utils/integrations";

async function loadRenderers(
  renderers: AstroRenderer[],
  viteServer: ViteDevServer,
): Promise<SSRLoadedRenderer[]> {
  const loadedRenderers = await Promise.all(
    renderers.map(async (renderer) => {
      const mod = await viteServer.ssrLoadModule(
        renderer.serverEntrypoint.toString(),
      );
      if (typeof mod.default !== "undefined") {
        return {
          name: renderer.name,
          ...(renderer.clientEntrypoint
            ? { clientEntrypoint: renderer.clientEntrypoint }
            : {}),
          ssr: mod.default,
        };
      }
    }),
  );

  return loadedRenderers.filter(
    (renderer): renderer is SSRLoadedRenderer => renderer !== undefined,
  );
}

export async function loadRenderersFromIntegrations(
  integrations: AstroIntegration[],
  viteServer: ViteDevServer,
): Promise<SSRLoadedRenderer[]> {
  const renderers: AstroRenderer[] = [];
  await executeIntegrationsConfigSetup(integrations, {
    addRenderer: (renderer: AstroRenderer) => {
      renderers.push(renderer);
    },
  });

  return loadRenderers(renderers, viteServer);
}
