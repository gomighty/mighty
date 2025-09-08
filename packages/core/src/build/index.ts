import path from "node:path";
import { type AstroInlineConfig, build as astroBuild } from "astro";
import { mergeConfig } from "astro/config";
import type { MightyServerOptions } from "@/types";

export async function build(options?: MightyServerOptions): Promise<void> {
  const mightyConfig: AstroInlineConfig = {
    adapter: {
      name: "mighty-adapter",
      hooks: {
        "astro:config:done": ({ setAdapter }) => {
          setAdapter({
            name: "mighty-adapter",
            serverEntrypoint: path.join(__dirname, "./server-entrypoint.mjs"),
            supportedAstroFeatures: {
              serverOutput: "stable",
              sharpImageService: "stable",
              hybridOutput: "stable",
            },
            exports: ["manifest"],
          });
        },
      },
    },
  };
  const userConfig = options?.config ?? {};

  await astroBuild(mergeConfig(userConfig, mightyConfig));
}
