import { fileURLToPath } from "node:url";
import { type AstroInlineConfig, build as astroBuild } from "astro";
import { mergeConfig } from "astro/config";
import type { MightyServerOptions } from "@/types";

/**
 * Builds the Astro project.
 */
export async function build(options?: MightyServerOptions): Promise<void> {
  const mightyConfig: AstroInlineConfig = {
    adapter: {
      name: "mighty-adapter",
      hooks: {
        "astro:config:done": ({ setAdapter }) => {
          setAdapter({
            name: "mighty-adapter",
            entrypointResolution: "auto",
            serverEntrypoint: fileURLToPath(
              new URL("./server-entrypoint.mjs", import.meta.url),
            ),
            supportedAstroFeatures: {
              serverOutput: "stable",
              sharpImageService: "stable",
              hybridOutput: "stable",
            },
          });
        },
      },
    },
  };
  const userConfig = options?.config ?? {};

  await astroBuild(mergeConfig(userConfig, mightyConfig));
}
