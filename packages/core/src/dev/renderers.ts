import type { AstroIntegration, AstroRenderer, SSRLoadedRenderer } from "astro";
import type { RunnableDevEnvironment } from "vite";
import {
  getAstroSampleConfig,
  getAstroSampleIntegrationLogger,
} from "@/utils/astroDefaults";

async function loadRenderers(
  renderers: AstroRenderer[],
  viteDevEnv: RunnableDevEnvironment,
): Promise<SSRLoadedRenderer[]> {
  const loadedRenderers = await Promise.all(
    renderers.map(async (renderer) => {
      const mod = await viteDevEnv.runner.import(
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
  viteDevEnv: RunnableDevEnvironment,
): Promise<SSRLoadedRenderer[]> {
  const sampleConfig = await getAstroSampleConfig();
  const sampleLogger = getAstroSampleIntegrationLogger();

  const renderers = integrations
    .map((integration) => {
      let renderer: AstroRenderer | undefined;
      const addRendererFn = (r: AstroRenderer) => {
        renderer = r;
      };

      try {
        integration.hooks["astro:config:setup"]?.({
          config: sampleConfig,
          command: "dev",
          isRestart: false,
          updateConfig: () => sampleConfig,
          addRenderer: addRendererFn,
          addClientDirective: () => {},
          addMiddleware: () => {},
          addDevToolbarApp: () => {},
          addWatchFile: () => {},
          injectScript: () => {},
          injectRoute: () => {},
          createCodegenDir: () => new URL(""),
          logger: sampleLogger,
        });
      } catch {
        // Something went wrong with our mock integration call, we'll just ignore the error
      }

      return renderer;
    })
    .filter((renderer): renderer is AstroRenderer => renderer !== undefined);

  return loadRenderers(renderers, viteDevEnv);
}
