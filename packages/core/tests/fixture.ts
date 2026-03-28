import { rm } from "node:fs/promises";
import path from "node:path";
import type { AstroInlineConfig } from "astro";
import { mergeConfig } from "astro/config";
import { toFetchResponse, toReqRes } from "fetch-to-node";
import { build } from "@/build";
import { dev } from "@/dev";
import { start } from "@/start";
import type { MightyRenderRequest, MightyServerOptions } from "@/types";
import { dotStringToPath } from "@/utils/dotStringToPath";

export type DevRenderFunction = (
  req: MightyRenderRequest,
) => Promise<{ status: number; content: string }>;
export type StartRenderFunction = Awaited<ReturnType<typeof start>>["render"];

export type GetFromViteMiddlewareFunction = (
  path: string,
) => Promise<Response | undefined>;

export function getFixture(fixtureName: string): {
  fixtureRoot: string;
  outDir: string;
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
    import.meta.dirname,
    "..",
    "fixtures",
    ...dotStringToPath(fixtureName),
  );

  const outDir = path.join(
    fixtureRoot,
    `dist-${Math.random().toString(36).substring(2, 15)}`,
  );

  const clean = async () => {
    await rm(outDir, {
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

  const DEV_TEST_ADDRESS = "http://host-placeholder.test";

  return {
    fixtureRoot,
    outDir,
    startDevServer: async (params) => {
      const {
        render: rawRender,
        stop: stopDevServer,
        viteMiddleware,
      } = await dev({
        ...params,
        config: mergeConfig<AstroInlineConfig>(
          {
            root: fixtureRoot,
            logLevel: "warn",
          },
          params?.config ?? {},
        ),
      });

      return {
        render: (req) => rawRender({ ...req, address: DEV_TEST_ADDRESS }),
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
            outDir,
            logLevel: "warn",
            vite: {
              build: {
                rollupOptions: { external: ["@/context"] },
              },
            },
          },
          params?.config ?? {},
        ),
      });
    },
    startProdServer: async (params?: MightyServerOptions) => {
      const { render } = await start({
        config: mergeConfig<AstroInlineConfig>(
          {
            root: fixtureRoot,
            outDir,
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
