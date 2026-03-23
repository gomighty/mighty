import { rm } from "node:fs/promises";
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
  const fixtureRoot = path.join(
    import.meta.dirname,
    "..",
    "fixtures",
    fixtureName,
  );

  const outDir = path.join(
    fixtureRoot,
    `dist-${Math.random().toString(36).substring(2, 15)}`,
  );

  // Isolate Vite dep-optimization cache per Vitest run to prevent
  // ENOTEMPTY race when multiple `pnpm test` processes run in parallel.
  const viteCacheDir = path.join(
    import.meta.dirname,
    "..",
    "node_modules",
    `.vite-${process.ppid || process.pid}`,
  );

  const clean = async (): Promise<void> => {
    await rm(outDir, { recursive: true, force: true });
  };

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
              cacheDir: viteCacheDir,
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
            vite: { cacheDir: viteCacheDir },
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
