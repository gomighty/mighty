import { access } from "node:fs/promises";
import path from "node:path";
import {
  type AstroConfig,
  type AstroInlineConfig,
  dev as astroDev,
} from "astro";
import { mergeConfig } from "astro/config";
import type { Element } from "hast";
import type { Connect, ViteDevServer } from "vite";
import { getStylesForURL } from "@/dev/css";
import type { MightyRenderRequest } from "@/schemas";
import type { MightyDevOptions } from "@/types";
import { dotStringToPath } from "@/utils/dotStringToPath";
import { injectTagsIntoHead } from "@/utils/injectTagsIntoHead";
import type {
  MightyRenderFunction,
  MightyStartContainerFunction,
} from "./render-vite";
import { loadRenderersFromIntegrations } from "./renderers";
import { getInjectedScriptsFromIntegrations } from "./scripts";
import { getViteLogger } from "./viteLogger";

export async function setupDev(options: MightyDevOptions): Promise<{
  render: (
    request: MightyRenderRequest,
  ) => Promise<{ status: number; content: string }>;
  viteMiddleware: Connect.Server;
  stop: () => Promise<void>;
}> {
  let finalConfig: AstroConfig;
  let viteServer: ViteDevServer;

  const mightyConfig: AstroInlineConfig = {
    vite: {
      customLogger: getViteLogger(),
      server: {
        middlewareMode: true,
        cors: false,
        hmr: {
          overlay: false,
        },
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
    (await viteServer.ssrLoadModule(
      path.join(import.meta.dirname, "./render-vite.ts"),
    )) as {
      render: MightyRenderFunction;
      createContainer: MightyStartContainerFunction;
    };

  await createContainer(loadedRenderers, options.getAddress);

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
            src: `${options.getAddress()}/@id/astro:scripts/page.js`,
          },
          children: [],
        },
      ]
    : () => [];

  const renderComponentByPath = async (
    data: Omit<MightyRenderRequest, "component"> & {
      componentPath: `${string}.astro`;
    },
  ) => {
    const { componentPath, props, context, partial } = data;

    const [renderedComponent, styleTags] = await Promise.all([
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

    const viteClientScript: Element = {
      type: "element",
      tagName: "script",
      properties: {
        type: "module",
        src: `${options.getAddress()}/@vite/client`,
      },
      children: [],
    };

    return injectTagsIntoHead(
      renderedComponent,
      [
        ...styleTags,
        viteClientScript,
        ...getPageScripts(),
        ...headInlineScriptTags,
      ],
      partial,
    );
  };

  return {
    viteMiddleware: viteServer.middlewares,
    stop: () => viteServer.close(),
    render: async (request: MightyRenderRequest) => {
      try {
        const { component, props, context, partial } = request;

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

        return {
          status: 200,
          content: await renderComponentByPath({
            componentPath,
            props,
            context,
            partial,
          }),
        };
      } catch (error) {
        viteServer.ssrFixStacktrace(error as Error);

        if (!(options.showErrorPage ?? true)) {
          throw error;
        }

        return {
          status: 500,
          content: await renderComponentByPath({
            componentPath: path.join(
              import.meta.dirname,
              "components",
              "error-page",
              "ErrorPage.astro",
            ) as `${string}.astro`,
            props: {
              error: error as Error,
            },
            context: {},
            partial: false,
          }),
        };
      }
    },
  };
}
