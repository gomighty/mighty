import { randomBytes } from "node:crypto";
import { cpSync, mkdirSync } from "node:fs";
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

const FIXTURES_DIR = path.join(import.meta.dirname, "..", "fixtures");
const TMP_DIR = path.join(FIXTURES_DIR, ".tmp");

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
  const sourceFixtureRoot = path.join(
    FIXTURES_DIR,
    ...dotStringToPath(fixtureName),
  );

  const uniqueId = randomBytes(6).toString("hex");
  const fixtureRoot = path.join(TMP_DIR, uniqueId);
  mkdirSync(TMP_DIR, { recursive: true });
  cpSync(sourceFixtureRoot, fixtureRoot, { recursive: true });

  const outDir = path.join(fixtureRoot, "dist");

  // Each getFixture() call creates a unique fixtureRoot under fixtures/.tmp/,
  // so outDir, .astro, and node_modules/.vite are never shared between tests.
  // The whole .tmp/ directory is wiped before each test run via globalSetup,
  // so no cleanup is needed (and skipping it avoids racing with the vite
  // optimizer that may still be writing to .vite after viteServer.close()).
  const clean = async () => {};

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
            vite: {
              server: {
                ws: false,
              },
            },
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
        stop: stopDevServer,
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
        stop: async () => {},
      };
    },
    clean,
  };
}
