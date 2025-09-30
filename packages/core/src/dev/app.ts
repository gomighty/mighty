import { access } from "node:fs/promises";
import path from "node:path";
import {
  type AstroConfig,
  type AstroInlineConfig,
  dev as astroDev,
} from "astro";
import { mergeConfig } from "astro/config";
import type { Element } from "hast";
import { Hono } from "hono";
import type { ConnInfo } from "hono/conninfo";
import { cors } from "hono/cors";
import { validator } from "hono/validator";
import { isRunnableDevEnvironment, type ViteDevServer } from "vite";
import { getStylesForURL } from "@/dev/css";
import { getRuntimeConnInfo } from "@/runtime";
import { MightyRenderRequestSchema } from "@/schemas";
import type { MightyServerOptions } from "@/types";
import { adaptConnectMiddleware } from "@/utils/adaptConnectMiddleware";
import { dotStringToPath } from "@/utils/dotStringToPath";
import { injectTagsIntoHead } from "@/utils/injectTagsIntoHead";
import type {
  MightyRenderFunction,
  MightySetHostAddressFunction,
  MightyStartContainerFunction,
} from "./render";
import { loadRenderersFromIntegrations } from "./renderers";
import { getInjectedScriptsFromIntegrations } from "./scripts";
import { getViteLogger } from "./viteLogger";

export async function createDevHonoApp(options: MightyServerOptions): Promise<{
  app: Hono;
  viteServer: ViteDevServer;
}> {
  let finalConfig: AstroConfig;
  let viteServer: ViteDevServer;

  const mightyConfig: AstroInlineConfig = {
    vite: {
      customLogger: getViteLogger(),
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
    integrations: [
      {
        name: "mighty-integration",
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
    ],
  };

  await astroDev(mergeConfig(mightyConfig, options?.config ?? {}));

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

  // We need to import the renderers here and not in the render.ts file. Not sure why...
  const loadedRenderers = await loadRenderersFromIntegrations(
    finalConfig.integrations,
    ssrEnv,
  );

  const { render, createContainer, setHostAddress } =
    await ssrEnv.runner.import<{
      render: MightyRenderFunction;
      createContainer: MightyStartContainerFunction;
      setHostAddress: MightySetHostAddressFunction;
    }>(path.join(import.meta.dir, "./render.ts"));

  await createContainer(loadedRenderers);

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

  const getPageScripts: (connInfo: ConnInfo) => Element[] =
    injectedScripts.some((script) => script.stage === "page")
      ? (connInfo) => [
          {
            type: "element",
            tagName: "script",
            properties: {
              type: "module",
              src: `${connInfo.remote.address}/@id/astro:scripts/page.js`,
            },
            children: [],
          },
        ]
      : () => [];

  const app = new Hono();
  app.use(cors());
  app.use(async (c, next) => {
    const connInfo = await getRuntimeConnInfo(c);
    setHostAddress(connInfo.remote.address ?? "");
    await next();
  });

  app.post(
    "/render",
    validator("json", (value, c) => {
      const result = MightyRenderRequestSchema.safeParse(value);
      if (!result.success) {
        return c.json(result, 400);
      }
      return result.data;
    }),
    async (c) => {
      const connInfo = await getRuntimeConnInfo(c);

      const { component, props, context, partial } = c.req.valid("json");

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
          context,
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
          src: `${connInfo.remote.address}/@vite/client`,
        },
        children: [],
      };

      return c.html(
        injectTagsIntoHead(
          renderedComponent,
          [
            ...styleTags,
            viteClientScript,
            ...getPageScripts(connInfo),
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
