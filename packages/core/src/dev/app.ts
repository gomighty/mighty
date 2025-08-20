import { access } from "node:fs/promises";
import path from "node:path";
import { zValidator } from "@hono/zod-validator";
import {
  type AstroConfig,
  type AstroInlineConfig,
  dev as astroDev,
} from "astro";
import type { Element } from "hast";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { isRunnableDevEnvironment, type ViteDevServer } from "vite";
import { getStylesForURL } from "@/dev/css";
import { MightyRenderRequestSchema } from "@/schemas";
import type { MightyServerOptions } from "@/types";
import { adaptConnectMiddleware } from "@/utils/adaptConnectMiddleware";
import { dotStringToPath } from "@/utils/dotStringToPath";
import { injectTagsIntoHead } from "@/utils/injectTagsIntoHead";
import type {
  MightyRenderFunction,
  MightyStartContainerFunction,
} from "./render-dev";
import { loadRenderersFromIntegrations } from "./renderers";
import { getInjectedScriptsFromIntegrations } from "./scripts";

export async function createDevHonoApp(
  options: MightyServerOptions,
  getHostAddress: () => string,
): Promise<{
  app: Hono;
  viteServer: ViteDevServer;
}> {
  let finalConfig: AstroConfig;
  let viteServer: ViteDevServer;

  const mightyConfig: AstroInlineConfig = {
    vite: {
      server: {
        middlewareMode: true,
        cors: false,
      },
      plugins: [
        {
          name: "mighty-remove-unhandled-rejection-listener-hack",
          closeBundle() {
            // HACK: We remove the "unhandledRejection" event listener added by Astro
            // https://github.com/withastro/astro/blob/eadc9dd277d0075d7bff0e33c7a86f3fb97fdd61/packages/astro/src/vite-plugin-astro-server/plugin.ts#L125
            // The original removal logic assumes a Vite server is running, which is not the case in middleware mode
            process.removeAllListeners("unhandledRejection");
          },
        },
      ],
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

  // @ts-expect-error - finalConfig is defined at this point
  if (!finalConfig) {
    throw new Error("finalConfig is not defined");
  }

  // @ts-expect-error viteServer is defined at this point
  if (!viteServer) {
    throw new Error("viteServer is not defined");
  }

  const ssrEnv = viteServer.environments.ssr;
  if (!isRunnableDevEnvironment(ssrEnv)) {
    throw new Error("ssrEnv is not RunnableDevEnvironment");
  }

  // We need to import the renderers here and not in the render-dev.ts file. Not sure why...
  const loadedRenderers = await loadRenderersFromIntegrations(
    finalConfig.integrations,
    ssrEnv,
  );

  const { render, createContainer } = await ssrEnv.runner.import<{
    render: MightyRenderFunction;
    createContainer: MightyStartContainerFunction;
  }>(path.join(__dirname, "./render-dev.ts"));

  await createContainer(loadedRenderers, getHostAddress);

  const injectedScripts = await getInjectedScriptsFromIntegrations(
    finalConfig.integrations,
  );

  const headInlineScriptTags: Element[] = injectedScripts
    .filter((script) => script.stage === "head-inline")
    .map((script) => ({
      type: "element",
      tagName: "script",
      properties: {},
      children: [{ type: "text", value: script.content }],
    }));

  const getPageScripts: () => Element[] = injectedScripts.some(
    (script) => script.stage === "page",
  )
    ? () => [
        {
          type: "element",
          tagName: "script",
          properties: {
            type: "module",
            src: `${getHostAddress()}/@id/astro:scripts/page.js`,
          },
          children: [],
        },
      ]
    : () => [];

  const app = new Hono();
  app.use(cors());

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
        getStylesForURL(componentPath, viteServer).then((styles): Element[] =>
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

      const viteClientScript: Element = {
        type: "element",
        tagName: "script",
        properties: {
          type: "module",
          src: `${getHostAddress()}/@vite/client`,
        },
        children: [],
      };

      return c.html(
        injectTagsIntoHead(
          renderedComponent,
          [
            ...styleTags,
            viteClientScript,
            ...getPageScripts(),
            ...headInlineScriptTags,
          ],
          partial,
        ),
      );
    },
  );

  app.use(adaptConnectMiddleware(viteServer.middlewares));

  return { app, viteServer };
}
