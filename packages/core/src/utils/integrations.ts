import type { AstroIntegration, BaseIntegrationHooks } from "astro";
import {
  getAstroSampleConfig,
  getAstroSampleIntegrationLogger,
} from "./astroDefaults";

export async function executeIntegrationsConfigSetup(
  integrations: AstroIntegration[],
  configSetupOptions: Partial<
    Parameters<BaseIntegrationHooks["astro:config:setup"]>[0]
  >,
): Promise<void> {
  const sampleConfig = await getAstroSampleConfig();
  const sampleLogger = getAstroSampleIntegrationLogger();

  integrations.forEach((integration) => {
    try {
      integration.hooks["astro:config:setup"]?.({
        config: sampleConfig,
        command: "dev",
        isRestart: false,
        updateConfig: () => sampleConfig,
        addRenderer: () => {},
        addClientDirective: () => {},
        addMiddleware: () => {},
        addDevToolbarApp: () => {},
        addWatchFile: () => {},
        injectScript: () => {},
        injectRoute: () => {},
        createCodegenDir: () => new URL(""),
        logger: sampleLogger,
        ...configSetupOptions,
      });
    } catch {
      // Something went wrong with our mock integration call, we'll just ignore the error
    }
  });
}
