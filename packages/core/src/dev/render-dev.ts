import { experimental_AstroContainer as AstroContainer } from "astro/container";
import type { AstroComponentFactory } from "astro/runtime/server/index.js";

export async function render({
  componentPath,
  props,
  partial,
}: {
  componentPath: `${string}.astro`;
  props: Record<string, unknown>;
  partial: boolean;
}) {
  const container = await AstroContainer.create();

  const component: AstroComponentFactory = (
    await import(/* @vite-ignore */ componentPath)
  ).default;

  return container.renderToString(component, { props, partial });
}

export type MightyRenderFunction = typeof render;
