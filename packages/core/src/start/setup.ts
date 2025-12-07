import path from "node:path";
import { experimental_AstroContainer as AstroContainer } from "astro/container";
import type { AstroComponentFactory } from "astro/runtime/server/index.js";
import type { Element } from "hast";
import { runInContext } from "@/context";
import type {
  MightyRenderRequest,
  MightyServerOptions,
  MightyStartMiddleware,
} from "@/types";
import { dotStringToPath } from "@/utils/dotStringToPath";
import { getBuildPathsFromInlineConfig } from "@/utils/getBuildPathsFromInlineConfig";
import { injectTagsIntoHead } from "@/utils/injectTagsIntoHead";
import { importManifestAndRenderers } from "./importManifestAndRenderers";

export async function setupStart(
  options: MightyServerOptions,
): Promise<MightyStartMiddleware> {
  const { buildServerPath } = getBuildPathsFromInlineConfig(
    options.config ?? {},
  );

  const { manifest, renderers } = await importManifestAndRenderers(
    options.config ?? {},
  );

  const container = await AstroContainer.create({
    manifest,
    renderers,
    async resolve(s) {
      return manifest.entryModules[s] ?? s;
    },
  });

  return {
    render: async (request: MightyRenderRequest) => {
      const { component, props, context, partial = true } = request;

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
        return { redirectTo: routeInfo.file };
      }

      const entryModule =
        manifest.entryModules[`\u0000@astro-page:${componentPath}@_@astro`];
      if (!entryModule) {
        return { status: 404, content: `Component ${component} not found` };
      }

      const styleTags: Element[] = routeInfo.styles.map((style) => {
        if (style.type === "inline") {
          return {
            type: "element",
            tagName: "style",
            properties: {
              type: "text/css",
            },
            children: [{ type: "text", value: style.content }],
          };
        }
        if (style.type === "external") {
          return {
            type: "element",
            tagName: "link",
            properties: {
              rel: "stylesheet",
              href: style.src,
            },
            children: [],
          };
        }
        throw new Error(
          `Unknown style type in manifest: ${JSON.stringify(style)}`,
        );
      });

      const componentModule: AstroComponentFactory = await import(
        path.join(buildServerPath, entryModule)
      ).then((module) => module.page().default);
      const renderedComponent = await runInContext(context, () =>
        container.renderToString(componentModule, { props, partial }),
      );

      return {
        status: 200,
        content: injectTagsIntoHead(renderedComponent, styleTags, partial),
      };
    },
  };
}
