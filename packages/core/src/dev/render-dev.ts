import type { SSRLoadedRenderer } from "astro";
import { experimental_AstroContainer as AstroContainer } from "astro/container";
import type { AstroComponentFactory } from "astro/runtime/server/index.js";

let container: AstroContainer | undefined;

export async function createContainer(renderers: SSRLoadedRenderer[]) {
  container = await AstroContainer.create({ renderers });
}

export type MightyStartContainerFunction = typeof createContainer;

export async function render({
  componentPath,
  props,
  partial,
}: {
  componentPath: `${string}.astro`;
  props: Record<string, unknown>;
  partial: boolean;
}) {
  if (!container) {
    throw new Error("Container not created");
  }

  const component: AstroComponentFactory = (
    await import(/* @vite-ignore */ componentPath)
  ).default;

  return container.renderToString(component, { props, partial });
}

export type MightyRenderFunction = typeof render;
