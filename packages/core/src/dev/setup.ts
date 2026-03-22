import { access } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import {
  type AstroConfig,
  type AstroInlineConfig,
  dev as astroDev,
  type RouteInfo,
  type SSRLoadedRenderer,
} from "astro";
import { mergeConfig } from "astro/config";
import type { Element } from "hast";
import type { ViteDevServer } from "vite";
import { getRouteHeadElements } from "@/astro/route-assets";
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
import { createResolve } from "./resolve";

const require = createRequire(import.meta.url);
const devDir = path.join(path.dirname(require.resolve("@gomighty/core/dev")));

export async function setupDev(
  options: MightyServerOptions,
): Promise<MightyDevMiddleware> {
  let finalConfig: AstroConfig;
  let viteServer: ViteDevServer;
  const existingUnhandledRejectionListeners = new Set(
    process.listeners("unhandledRejection"),
  );

  const mightyConfig: AstroInlineConfig = {
    vite: {
      server: {
        middlewareMode: true,
        cors: false,
      },
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
  for (const listener of process.listeners("unhandledRejection")) {
    if (!existingUnhandledRejectionListeners.has(listener)) {
      process.off("unhandledRejection", listener);
    }
  }

  // @ts-expect-error - finalConfig is defined at this point
  if (!finalConfig) {
    throw new Error("finalConfig is not defined");
  }

  // @ts-expect-error viteServer is defined at this point
  if (!viteServer) {
    throw new Error("viteServer is not defined");
  }

  const [{ routes }, { renderers }] = await Promise.all([
    viteServer.ssrLoadModule("virtual:astro:routes") as Promise<{
      routes: RouteInfo[];
    }>,
    viteServer.ssrLoadModule("virtual:astro:renderers") as Promise<{
      renderers: SSRLoadedRenderer[];
    }>,
  ]);

  const { render: renderComponent, createContainer } =
    (await viteServer.ssrLoadModule(path.join(devDir, "./render-vite.ts"))) as {
      render: MightyRenderFunction;
      createContainer: MightyStartContainerFunction;
    };

  const resolve = createResolve(viteServer.environments.ssr, finalConfig.root);

  await createContainer(renderers, resolve);

  return {
    viteMiddleware: viteServer.middlewares,
    stop: () => viteServer.close(),
    render: async (request: MightyRenderDevRequest) => {
      try {
        const {
          component,
          props = {},
          context = {},
          partial = true,
          address,
        } = request;

        const routeComponentPath = path.join(
          "src",
          "pages",
          ...dotStringToPath(component),
        );
        const componentPath: `${string}.astro` = `${path.join(
          finalConfig.root.pathname,
          routeComponentPath,
        )}.astro`;

        const doesComponentExist = await access(componentPath)
          .then(() => true)
          .catch(() => false);
        if (!doesComponentExist) {
          return { status: 404, content: `Component ${component} not found` };
        }

        const routeInfo = findRouteInfo(routes, routeComponentPath);
        if (!routeInfo) {
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
            ...mergeRouteHeadElements(
              prefixDevAssetElements(getRouteHeadElements(routeInfo)),
              styleTags,
            ),
            viteClientScript,
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

function findRouteInfo(
  routes: RouteInfo[],
  componentPath: string,
): RouteInfo | undefined {
  return routes.find(
    (route) => route.routeData.component === `${componentPath}.astro`,
  );
}

function mergeRouteHeadElements(
  routeHeadElements: Element[],
  styleTags: Element[],
): Element[] {
  const routeStyleSources = new Set(
    routeHeadElements
      .filter((element) => element.tagName === "link")
      .map((element) => String(element.properties?.href ?? "")),
  );

  return [
    ...styleTags.filter(
      (tag) =>
        tag.tagName !== "link" ||
        !routeStyleSources.has(String(tag.properties?.href ?? "")),
    ),
    ...routeHeadElements,
  ];
}

function prefixDevAssetElements(elements: Element[]): Element[] {
  return elements.map((element) => {
    if (element.tagName === "script" || element.tagName === "link") {
      const key = element.tagName === "script" ? "src" : "href";
      const value = element.properties?.[key];
      if (typeof value === "string" && value.startsWith("/")) {
        return {
          ...element,
          properties: {
            ...element.properties,
            [key]: `${MIGHTY_DEV_PLACEHOLDER_ADDRESS}${value}`,
          },
        };
      }
    }

    return element;
  });
}
