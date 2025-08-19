import type { AstroConfig, AstroIntegrationLogger } from "astro";
import { validateConfig } from "astro/config";

export function getAstroSampleConfig(): Promise<AstroConfig> {
  return validateConfig({}, ".", "dev");
}

export function getAstroSampleIntegrationLogger(
  label: string = "sampleLogger",
): AstroIntegrationLogger {
  return {
    options: {
      dest: {
        write: () => true,
      },
      level: "silent",
    },
    label,
    info: () => {},
    warn: () => {},
    error: () => {},
    debug: () => {},
    fork: getAstroSampleIntegrationLogger,
  };
}
