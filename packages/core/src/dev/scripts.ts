import type { AstroIntegration, InjectedScriptStage } from "astro";
import {
  getAstroSampleConfig,
  getAstroSampleIntegrationLogger,
} from "@/utils/astroDefaults";

type InjectedScript = {
  stage: InjectedScriptStage;
  content: string;
};

export async function getInjectedScriptsFromIntegrations(
  integrations: AstroIntegration[],
): Promise<InjectedScript[]> {
  const sampleConfig = await getAstroSampleConfig();
  const sampleLogger = getAstroSampleIntegrationLogger();

  return integrations
    .map((integration) => {
      let injectedScript: InjectedScript | undefined;
      const injectScriptFn = (stage: InjectedScriptStage, content: string) => {
        injectedScript = { stage, content };
      };

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
          injectScript: injectScriptFn,
          injectRoute: () => {},
          createCodegenDir: () => new URL(""),
          logger: sampleLogger,
        });
      } catch {
        // Something went wrong with our mock integration call, we'll just ignore the error
      }

      return injectedScript;
    })
    .filter(
      (injectedScript): injectedScript is InjectedScript =>
        injectedScript !== undefined,
    );
}
