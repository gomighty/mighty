import { rm } from "node:fs/promises";
import path from "node:path";
import type { AstroInlineConfig } from "astro";
import { mergeConfig } from "astro/config";
import { build } from "@/build";
import { createDevHonoApp } from "@/dev/app";
import type { MightyServerOptions } from "@/types";
import { dotStringToPath } from "@/utils/dotStringToPath";

export type AppRequestFunction = (
  input: string | URL,
  requestInit?: RequestInit,
) => Promise<Response>;

export function getFixture(fixtureName: string) {
  const fixtureRoot = path.join(
    __dirname,
    "..",
    "fixtures",
    ...dotStringToPath(fixtureName),
  );

  const clean = async () => {
    await rm(path.join(fixtureRoot, "dist"), {
      recursive: true,
      force: true,
    });
    await rm(path.join(fixtureRoot, ".astro"), {
      recursive: true,
      force: true,
    });
    await rm(path.join(fixtureRoot, "node_modules"), {
      recursive: true,
      force: true,
    });
  };

  return {
    fixtureRoot,
    startDevServer: async (params?: MightyServerOptions) => {
      const { app, viteServer } = await createDevHonoApp({
        config: mergeConfig<AstroInlineConfig>(
          {
            root: fixtureRoot,
            logLevel: "warn",
          },
          params?.config ?? {},
        ),
      });

      const request: AppRequestFunction = async (input, requestInit) => {
        return app.request(input, requestInit, {
          requestIP() {
            return {
              address: "http://host-placeholder.test",
              family: "IPv4",
              port: 80,
            };
          },
        });
      };

      return {
        app,
        request,
        stop: async () => {
          await viteServer.close();
          await clean();
        },
      };
    },
    build: async (params?: MightyServerOptions) => {
      await build({
        config: {
          root: fixtureRoot,
          logLevel: "warn",
          vite: { build: { rollupOptions: { external: ["@gomighty/core"] } } },
          ...params?.config,
        },
      });
    },
    clean,
  };
}
