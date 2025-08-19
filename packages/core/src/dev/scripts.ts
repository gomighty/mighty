import type { RunnableDevEnvironment } from "vite";

export async function isPageScriptInjected(viteDevEnv: RunnableDevEnvironment) {
  try {
    const module = await viteDevEnv.runner.import("astro:scripts/page.js");
    return Object.keys(module).length > 0;
  } catch {
    // The script contents threw while being executed, which means there IS a script injected
    return true;
  }
}
