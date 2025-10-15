import { rm } from "node:fs/promises";
import path from "node:path";
import type { AstroInlineConfig } from "astro";
import { mergeConfig } from "astro/config";
import { toFetchResponse, toReqRes } from "fetch-to-node";
import { build } from "@/build";
import { setupDev } from "@/dev/setup";
import { setupStart } from "@/start/setup";
import type { MightyServerOptions } from "@/types";
import { dotStringToPath } from "@/utils/dotStringToPath";

export type DevRenderFunction = Awaited<ReturnType<typeof setupDev>>["render"];
export type StartRenderFunction = Awaited<
  ReturnType<typeof setupStart>
>["render"];

export type GetFromViteMiddlewareFunction = (
  path: string,
) => Promise<Response | undefined>;

export function getFixture(fixtureName: string): {
  fixtureRoot: string;
  startDevServer: (params?: MightyServerOptions) => Promise<{
    render: DevRenderFunction;
    getFromViteMiddleware: GetFromViteMiddlewareFunction;
    stop: () => Promise<void>;
  }>;
  build: (params?: MightyServerOptions) => Promise<void>;
  startProdServer: (params?: MightyServerOptions) => Promise<{
    render: StartRenderFunction;
    stop: () => Promise<void>;
  }>;
  clean: () => Promise<void>;
} {
  const fixtureRoot = path.join(
    import.meta.dir,
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
      const {
        render,
        stop: stopDevServer,
        viteMiddleware,
      } = await setupDev({
        config: mergeConfig<AstroInlineConfig>(
          {
            root: fixtureRoot,
            logLevel: "warn",
          },
          params?.config ?? {},
        ),
        getAddress: () => "http://host-placeholder.test",
      });

      return {
        render,
        getFromViteMiddleware: async (path: string) => {
          const { req, res } = toReqRes(
            new Request(
              new URL(path, "http://host-placeholder.test").toString(),
              { headers: { host: "localhost" } },
            ),
          );

          return new Promise<Response | undefined>((resolve, reject) => {
            viteMiddleware(req, res, (err: unknown) => {
              if (err) reject(err);
              else resolve(undefined);
            });
            toFetchResponse(res).then(resolve);
          });
        },
        stop: async () => {
          await stopDevServer();
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
      const { render } = await setupStart({
        config: mergeConfig<AstroInlineConfig>(
          {
            root: fixtureRoot,
            logLevel: "warn",
          },
          params?.config ?? {},
        ),
      });

      return {
        render,
        stop: async () => {
          await clean();
        },
      };
    },
    clean,
  };
}
