import { runInContext } from "@gomighty/core/context";
import type { SSRLoadedRenderer } from "astro";
import { experimental_AstroContainer as AstroContainer } from "astro/container";
import type { AstroComponentFactory } from "astro/runtime/server/index.js";
import type { MightyContext } from "@/types";

let container: AstroContainer | undefined;

export async function createContainer(
  renderers: SSRLoadedRenderer[],
  resolve: (s: string) => Promise<string>,
): Promise<void> {
  container = await AstroContainer.create({
    renderers,
    resolve,
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
