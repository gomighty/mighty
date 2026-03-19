import { access } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import {
  type AstroConfig,
  type AstroInlineConfig,
  dev as astroDev,
} from "astro";
import { mergeConfig } from "astro/config";
import type { Element } from "hast";
import type { ViteDevServer } from "vite";
import { getStylesForURL } from "@/dev/css";
import type {
  MightyDevMiddleware,
  MightyRenderDevRequest,
  MightyServerOptions,
} from "@/types";
import { dotStringToPath } from "@/utils/dotStringToPath";
import { injectTagsIntoHead } from "@/utils/injectTagsIntoHead";
import { MIGHTY_DEV_PLACEHOLDER_ADDRESS } from "./constants";
import type {
  MightyRenderFunction,
  MightyStartContainerFunction,
} from "./render-vite";
import { loadRenderersFromIntegrations } from "./renderers";
import { createResolve } from "./resolve";
import { getInjectedScriptsFromIntegrations } from "./scripts";
import { getViteLogger } from "./viteLogger";

const require = createRequire(import.meta.url);
const devDir = path.join(path.dirname(require.resolve("@gomighty/core/dev")));

export async function setupDev(
  options: MightyServerOptions,
): Promise<MightyDevMiddleware> {
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

  await astroDev(mergeConfig(mightyConfig, options.config ?? {}));

  // @ts-expect-error - finalConfig is defined at this point
  if (!finalConfig) {
    throw new Error("finalConfig is not defined");
  }

  // @ts-expect-error viteServer is defined at this point
  if (!viteServer) {
    throw new Error("viteServer is not defined");
  }

  // We need to import the renderers here and not in the render-vite.ts file. Not sure why...
  const loadedRenderers = await loadRenderersFromIntegrations(
    finalConfig.integrations,
    viteServer,
  );

  const { render: renderComponent, createContainer } =
    (await viteServer.ssrLoadModule(path.join(devDir, "./render-vite.ts"))) as {
      render: MightyRenderFunction;
      createContainer: MightyStartContainerFunction;
    };

  const resolve = createResolve(viteServer.environments.ssr, finalConfig.root);

  await createContainer(loadedRenderers, resolve);

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
            src: `${MIGHTY_DEV_PLACEHOLDER_ADDRESS}/@id/astro:scripts/page.js`,
          },
          children: [],
        },
      ]
    : () => [];

  return {
    viteMiddleware: viteServer.middlewares,
    stop: () => viteServer.close(),
    render: async (request: MightyRenderDevRequest) => {
      try {
        const { component, props, context, partial = true, address } = request;

        const componentPath: `${string}.astro` = `${path.join(
          finalConfig.srcDir.pathname,
          "pages",
          ...dotStringToPath(component),
        )}.astro`;

        const doesComponentExist = await access(componentPath)
          .then(() => true)
          .catch(() => false);
        if (!doesComponentExist) {
          return { status: 404, content: `Component ${component} not found` };
        }

        const [rawRenderedComponent, styleTags] = await Promise.all([
          renderComponent({
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

        // Rewrite image URLs to include the dev address
        const renderedComponent = rawRenderedComponent.replace(
          /(["'(])\/@fs\//g,
          `$1${MIGHTY_DEV_PLACEHOLDER_ADDRESS}/@fs/`,
        );

        const viteClientScript: Element = {
          type: "element",
          tagName: "script",
          properties: {
            type: "module",
            src: `${MIGHTY_DEV_PLACEHOLDER_ADDRESS}/@vite/client`,
          },
          children: [],
        };

        const content = injectTagsIntoHead(
          renderedComponent,
          [
            ...styleTags,
            viteClientScript,
            ...getPageScripts(),
            ...headInlineScriptTags,
          ],
          partial,
        ).replaceAll(MIGHTY_DEV_PLACEHOLDER_ADDRESS, address);

        return { status: 200, content };
      } catch (error) {
        viteServer.ssrFixStacktrace(error as Error);

        const hmr = finalConfig.vite?.server?.hmr;
        const overlayEnabled =
          typeof hmr === "object" ? hmr.overlay !== false : hmr !== false;

        if (!overlayEnabled) {
          throw error;
        }

        setTimeout(() => {
          viteServer.environments.client.hot.send({
            type: "error",
            err: error as Error & { stack: string },
          });
        }, 200);

        return {
          status: 500,
          content: `<html><head><title>${(error as Error).name}</title><script type="module" src="${request.address}/@vite/client"></script></head><body></body></html>`,
        };
      }
    },
  };
}
