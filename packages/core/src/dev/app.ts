import { access } from "node:fs/promises";
import path from "node:path";
import { zValidator } from "@hono/zod-validator";
import {
  type AstroConfig,
  type AstroInlineConfig,
  dev as astroDev,
} from "astro";
import type { ElementContent } from "hast";
import { Hono } from "hono";
import { isRunnableDevEnvironment, type ViteDevServer } from "vite";
import { MightyRenderRequestSchema } from "@/schemas";
import { getStylesForURL } from "@/dev/styles";
import type { MightyServerOptions } from "@/types";
import { adaptConnectMiddleware } from "@/utils/adaptConnectMiddleware";
import { dotStringToPath } from "@/utils/dotStringToPath";
import { injectTagsIntoHead } from "@/utils/injectTagsIntoHead";
import type { MightyRenderFunction } from "./render-dev";

export async function createDevHonoApp(
  options?: MightyServerOptions,
): Promise<{ app: Hono; viteServer: ViteDevServer }> {
  let finalConfig: AstroConfig;
  let viteServer: ViteDevServer;

  const mightyConfig: AstroInlineConfig = {
    vite: {
      server: {
        middlewareMode: true,
      },
    },
    adapter: {
      name: "mighty-adapter",
      hooks: {
        "astro:config:done": ({ config }) => {
          finalConfig = config;
        },
        "astro:server:setup": async ({ server }) => {
          server.listen = async () => {
            return server;
          };
          // @ts-expect-error - This is a hack to make Astro work in middleware mode
          server.httpServer = {
            address() {
              return null;
            },
          };
          server.bindCLIShortcuts = () => {};

          viteServer = server;
        },
      },
    },
  };

  const userConfig = options?.config ?? {};

  await astroDev({ ...userConfig, ...mightyConfig });

  // @ts-expect-error viteServer is defined at this point
  if (!viteServer) {
    throw new Error("viteServer is not defined");
  }

  const ssrEnv = viteServer.environments.ssr;
  if (!isRunnableDevEnvironment(ssrEnv)) {
    throw new Error("ssrEnv is not RunnableDevEnvironment");
  }

  const { render } = await ssrEnv.runner.import<{
    render: MightyRenderFunction;
  }>(path.join(__dirname, "./render-dev.ts"));

  const app = new Hono();

  app.post(
    "/render",
    zValidator("json", MightyRenderRequestSchema),
    async (c) => {
      const { component, props, partial } = c.req.valid("json");

      const componentPath: `${string}.astro` = `${path.join(
        finalConfig.srcDir.pathname,
        "pages",
        ...dotStringToPath(component),
      )}.astro`;

      const doesComponentExist = await access(componentPath)
        .then(() => true)
        .catch(() => false);
      if (!doesComponentExist) {
        return c.text(`Component ${component} not found`, 404);
      }

      const [renderedComponent, styleTags] = await Promise.all([
        render({
          componentPath,
          props,
          partial,
        }),
        getStylesForURL(componentPath, viteServer).then(
          (styles): ElementContent[] =>
            styles.styles.map((style) => ({
              type: "element",
              tagName: "style",
              properties: {
                type: "text/css",
                "data-vite-dev-id": style.id,
              },
              children: [{ type: "text", value: style.content }],
            })),
        ),
      ]);

      return c.html(injectTagsIntoHead(renderedComponent, styleTags, partial));
    },
  );

  app.use(adaptConnectMiddleware(viteServer.middlewares));

  return { app, viteServer };
}
