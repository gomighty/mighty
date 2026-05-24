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
      destination: {
        write: () => {},
      },
      level: "silent",
    },
    label,
    info: () => {},
    warn: () => {},
    error: () => {},
    debug: () => {},
    fork: getAstroSampleIntegrationLogger,
    flush: () => {},
    close: () => {},
  };
}
