import { runInContext } from "@gomighty/core/context";
import type { SSRLoadedRenderer } from "astro";
import { experimental_AstroContainer as AstroContainer } from "astro/container";
import type { AstroComponentFactory } from "astro/runtime/server/index.js";
import type { DevEnvironment } from "vite";
import type { MightyContext } from "@/types";
import { resolveIdToUrl } from "../utils/resolveIdToUrl";

let container: AstroContainer | undefined;

export async function createContainer(
  renderers: SSRLoadedRenderer[],
  getAddress: () => string,
  ssrEnvironment: DevEnvironment,
  root: URL,
): Promise<void> {
  container = await AstroContainer.create({
    renderers,
    async resolve(s) {
      const address = getAddress();
      if (s.startsWith("astro:scripts")) {
        return `${address}/@id/${s}`;
      }
      if (s.startsWith("/@id")) {
        return `${address}${s}`;
      }
      const resolved = await resolveIdToUrl(ssrEnvironment, s, root);
      return `${address}${resolved}`;
    },
  });
}

export type MightyStartContainerFunction = typeof createContainer;

export async function render({
  componentPath,
  props,
  context,
  partial,
}: {
  componentPath: `${string}.astro`;
  props: Record<string, unknown>;
  context: MightyContext;
  partial: boolean;
}): Promise<string> {
  const component: AstroComponentFactory = (
    await import(/* @vite-ignore */ componentPath)
  ).default;

  return runInContext(context, () => {
    if (!container) {
      throw new Error("Container not created");
    }
    return container.renderToString(component, { props, partial });
  });
}

export type MightyRenderFunction = typeof render;
