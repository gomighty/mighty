import path from "node:path";
import type { RouteInfo } from "astro";
import { experimental_AstroContainer as AstroContainer } from "astro/container";
import type { AstroComponentFactory } from "astro/runtime/server/index.js";
import { loadBuildManifest, loadBuiltPageModule } from "@/astro/manifest";
import { getRouteHeadElements } from "@/astro/route-assets";
import { runInContext } from "@/context";
import type {
  MightyRenderRequest,
  MightyServerOptions,
  MightyStartMiddleware,
} from "@/types";
import { dotStringToPath } from "@/utils/dotStringToPath";
import { injectTagsIntoHead } from "@/utils/injectTagsIntoHead";

export async function setupStart(
  options: MightyServerOptions,
): Promise<MightyStartMiddleware> {
  const manifest = await loadBuildManifest(options.config ?? {});

  const container = await AstroContainer.create({
    manifest,
    renderers: manifest.renderers,
    async resolve(s) {
      return manifest.entryModules[s] ?? s;
    },
  });

  return {
    render: async (request: MightyRenderRequest) => {
      const { component, props = {}, context = {}, partial = true } = request;

      const componentPath = path.join(
        "src",
        "pages",
        ...dotStringToPath(component),
      );

      const routeInfo = manifest.routes.find(
        (route) => route.routeData.component === `${componentPath}.astro`,
      );
      if (!routeInfo) {
        return { status: 404, content: `Component ${component} not found` };
      }

      if (routeInfo.routeData.prerender) {
        return {
          redirectTo: path.join(
            routeInfo.routeData.pathname ?? "/",
            "index.html",
          ),
        };
      }

      const entryModule = await loadBuiltPageModule(manifest, componentPath);

      if (!entryModule) {
        return { status: 404, content: `Component ${component} not found` };
      }

      const componentModule = await resolvePageComponent(
        entryModule,
        routeInfo,
      );
      const renderedComponent = await runInContext(context, () =>
        container.renderToString(componentModule, { props, partial }),
      );

      return {
        status: 200,
        content: injectTagsIntoHead(
          renderedComponent,
          getRouteHeadElements(routeInfo),
          partial,
        ),
      };
    },
  };
}

async function resolvePageComponent(
  entryModule: {
    page?: () => Promise<{ default: AstroComponentFactory }>;
  },
  routeInfo: RouteInfo,
): Promise<AstroComponentFactory> {
  if ("page" in entryModule && typeof entryModule.page === "function") {
    return (await entryModule.page()).default;
  }

  throw new Error(
    `Failed to load page module for ${routeInfo.routeData.route}`,
  );
}
