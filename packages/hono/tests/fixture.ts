import { randomBytes } from "node:crypto";
import { cpSync, mkdirSync } from "node:fs";
import path from "node:path";
import { build } from "@gomighty/core/build";
import type { MightyServerOptions } from "@gomighty/core/types";
import type { AstroInlineConfig } from "astro";
import { mergeConfig } from "astro/config";
import { Hono } from "hono";
import { devMiddleware } from "@/dev";
import { startMiddleware } from "@/start";
import type { MightyMiddlewareHandler } from "@/types";

type AppEnv = {
  Variables: {
    share: (data: Record<string, unknown>) => void;
  };
};

const FIXTURES_DIR = path.join(import.meta.dirname, "..", "fixtures");
const TMP_DIR = path.join(FIXTURES_DIR, ".tmp");

export function getFixture(fixtureName: string): {
  fixtureRoot: string;
  outDir: string;
  build: (params?: MightyServerOptions) => Promise<void>;
  createStartApp: (params?: MightyServerOptions) => {
    app: Hono<AppEnv>;
    middleware: MightyMiddlewareHandler;
  };
  createDevApp: (params?: MightyServerOptions) => {
    app: Hono<AppEnv>;
    middleware: MightyMiddlewareHandler;
    stop: () => Promise<void>;
  };
  clean: () => Promise<void>;
} {
  const sourceFixtureRoot = path.join(FIXTURES_DIR, fixtureName);

  const uniqueId = randomBytes(6).toString("hex");
  const fixtureRoot = path.join(TMP_DIR, uniqueId);
  mkdirSync(TMP_DIR, { recursive: true });
  cpSync(sourceFixtureRoot, fixtureRoot, { recursive: true });

  const outDir = path.join(fixtureRoot, "dist");

  // Each getFixture() call creates a unique fixtureRoot under fixtures/.tmp/,
  // so outDir, .astro, dist, and node_modules/.vite are never shared between
  // tests. The whole .tmp/ directory is wiped before each test run via
  // globalSetup, so no cleanup is needed.
  const clean = async (): Promise<void> => {};

  return {
    fixtureRoot,
    outDir,
    build: async (params) => {
      await build({
        config: mergeConfig<AstroInlineConfig>(
          {
            root: fixtureRoot,
            outDir,
            logLevel: "warn",
            vite: {
              build: {
                rollupOptions: {
                  external: ["@gomighty/core/context"],
                },
              },
            },
          },
          params?.config ?? {},
        ),
      });
    },
    createStartApp: (params) => {
      const middleware = startMiddleware({
        config: mergeConfig<AstroInlineConfig>(
          { root: fixtureRoot, outDir, logLevel: "warn" },
          params?.config ?? {},
        ),
      });
      const app = new Hono().use(middleware);
      return { app, middleware };
    },
    createDevApp: (params) => {
      const middleware = devMiddleware({
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
      const app = new Hono().use(middleware);
      return { app, middleware, stop: clean };
    },
    clean,
  };
}
