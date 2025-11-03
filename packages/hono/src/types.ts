import type { MightyRenderRequest } from "@gomighty/core";
import type { MiddlewareHandler } from "hono";

declare module "hono" {
  interface ContextRenderer {
    // biome-ignore lint/style/useShorthandFunctionType: ContextRenderer is an interface that has to be extended
    (req: MightyRenderRequest): Promise<Response>;
  }
}

export type StartMightyServerMiddlewareHandler = MiddlewareHandler<{
  Variables: {
    shareWithAstroComponent: (data: Record<string, unknown>) => void;
  };
}>;
