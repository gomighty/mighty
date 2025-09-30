import path from "node:path";
import { experimental_AstroContainer as AstroContainer } from "astro/container";
import type { AstroComponentFactory } from "astro/runtime/server/index.js";
import type { Element } from "hast";
import { Hono } from "hono";
import { validator } from "hono/validator";
import { runInContext } from "@/context";
import { MightyRenderRequestSchema } from "@/schemas";
import type { MightyServerOptions } from "@/types";
import { dotStringToPath } from "@/utils/dotStringToPath";
import { getBuildPathsFromInlineConfig } from "@/utils/getBuildPathsFromInlineConfig";
import { injectTagsIntoHead } from "@/utils/injectTagsIntoHead";
import { getRuntimeSpecificServeStatic } from "./getRuntimeSpecificServeStatic";
import { importManifestAndRenderers } from "./importManifestAndRenderers";

export async function createProdHonoApp(options: MightyServerOptions): Promise<{
  app: Hono;
}> {
  const { buildServerPath } = getBuildPathsFromInlineConfig(
    options.config ?? {},
  );

  const { data: manifestAndRenderers, error: manifestAndRenderersError } =
    await importManifestAndRenderers(options.config ?? {});
  if (manifestAndRenderersError) {
    throw new Error(
      "Failed to load manifest file and/or renderers. Did you build your project?",
    );
  }
  const { manifest, renderers } = manifestAndRenderers;

  const container = await AstroContainer.create({
    manifest,
    renderers,
    async resolve(s) {
      return manifest.entryModules[s] ?? s;
    },
  });

  const app = new Hono();

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
      const { component, props, context, partial } = c.req.valid("json");

      const componentPath = path.join(
        "src",
        "pages",
        ...dotStringToPath(component),
      );

      const routeInfo = manifest.routes.find(
        (route) => route.routeData.component === `${componentPath}.astro`,
      );
      if (!routeInfo) {
        return c.text(`Component ${component} not found`, 404);
      }

      if (routeInfo.routeData.prerender) {
        return c.redirect(routeInfo.file);
      }

      const entryModule =
        manifest.entryModules[`\u0000@astro-page:${componentPath}@_@astro`];
      if (!entryModule) {
        return c.text(`Component ${component} not found`, 404);
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

      return c.html(injectTagsIntoHead(renderedComponent, styleTags, partial));
    },
  );

  app.use("*", await getRuntimeSpecificServeStatic(options));

  return { app };
}
