import type { MiddlewareHandler } from "hono";

export type MightyHonoRenderRequest = {
  /**
   * The path of the Astro component to render, in dot notation.
   *
   * @example "posts.index"
   */
  component: string;
  /**
   * An object containing the props to pass to the Astro component.
   */
  props?: Record<string, unknown>;
  /**
   * Whether to render the component as a partial (fragment) or a full page.
   *
   * @default true
   */
  partial?: boolean;
};

declare module "hono" {
  interface ContextRenderer {
    // biome-ignore lint/style/useShorthandFunctionType: ContextRenderer is an interface that has to be extended
    (req: MightyHonoRenderRequest): Promise<Response>;
  }
}

export type MightyMiddlewareHandler = MiddlewareHandler<{
  Variables: {
    share: (data: Record<string, unknown>) => void;
  };
}>;
