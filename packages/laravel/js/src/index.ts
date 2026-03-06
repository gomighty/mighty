import type { MightyRenderRequest, MightyServerOptions } from "@gomighty/core";
import { startMightyServer } from "@gomighty/hono";
import { Hono, type Hono as HonoType } from "hono";

declare module "hono" {
  interface ContextRenderer {
    // biome-ignore lint/style/useShorthandFunctionType: ContextRenderer is an interface that has to be extended
    (req: MightyRenderRequest): Promise<Response>;
  }
}

export function createSidecarApp(options?: MightyServerOptions): HonoType {
  const app = new Hono();
  app.use(startMightyServer(options));

  app.post("/render", async (c) => {
    const { component, props, context } = await c.req.json<{
      component: string;
      props?: Record<string, unknown>;
      context?: Record<string, unknown>;
    }>();
    return c.render({
      component,
      props: props ?? {},
      context: context ?? {},
    });
  });

  return app;
}

export async function startSidecar(
  options?: MightyServerOptions & { port?: number },
): Promise<void> {
  const port = options?.port ?? 5174;
  const app = createSidecarApp(options);

  if (typeof Bun !== "undefined") {
    Bun.serve({ fetch: app.fetch, port });
  } else {
    const { serve } = await import("@hono/node-server");
    serve({ fetch: app.fetch, port });
  }

  console.log(`Mighty sidecar running at http://localhost:${port}`);
}
