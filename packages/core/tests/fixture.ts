import { rm } from "node:fs/promises";
import path from "node:path";
import type { AstroInlineConfig } from "astro";
import { mergeConfig } from "astro/config";
import type { Hono } from "hono";
import { build } from "@/build";
import { createDevHonoApp } from "@/dev/app";
import { createProdHonoApp } from "@/start/app";
import type { MightyServerOptions } from "@/types";
import { dotStringToPath } from "@/utils/dotStringToPath";

export type AppRequestFunction = (
  input: string | URL,
  requestInit?: RequestInit,
) => Promise<Response>;

function requestFnWithDummyConnInfo(app: Hono): AppRequestFunction {
  return async (input, requestInit) => {
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
}

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

      return {
        app,
        request: requestFnWithDummyConnInfo(app),
        stop: async () => {
          await viteServer.close();
          await clean();
        },
      };
    },
    build: async (params?: MightyServerOptions) => {
      await build({
        config: mergeConfig<AstroInlineConfig>(
          {
            root: fixtureRoot,
            logLevel: "warn",
            vite: {
              build: {
                rollupOptions: { external: ["@gomighty/core", "@/context"] },
              },
            },
          },
          params?.config ?? {},
        ),
      });
    },
    startProdServer: async (params?: MightyServerOptions) => {
      const { app } = await createProdHonoApp({
        config: mergeConfig<AstroInlineConfig>(
          {
            root: fixtureRoot,
            logLevel: "warn",
          },
          params?.config ?? {},
        ),
      });

      return {
        app,
        request: requestFnWithDummyConnInfo(app),
        stop: async () => {
          await clean();
        },
      };
    },
    clean,
  };
}
