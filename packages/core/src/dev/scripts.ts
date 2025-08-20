import type { AstroIntegration, InjectedScriptStage } from "astro";
import { executeIntegrationsConfigSetup } from "@/utils/integrations";

type InjectedScript = {
  stage: InjectedScriptStage;
  content: string;
};

export async function getInjectedScriptsFromIntegrations(
  integrations: AstroIntegration[],
): Promise<InjectedScript[]> {
  const injectedScripts: InjectedScript[] = [];

  await executeIntegrationsConfigSetup(integrations, {
    injectScript: (stage: InjectedScriptStage, content: string) => {
      injectedScripts.push({ stage, content });
    },
  });

  return injectedScripts;
}
