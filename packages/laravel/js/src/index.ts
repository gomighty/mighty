import type { MightyRenderRequest, MightyServerOptions } from "@gomighty/core";
import { startMightyServer } from "@gomighty/hono";
import { mergeConfig } from "astro/config";
import { Hono } from "hono";

declare module "hono" {
  interface ContextRenderer {
    // biome-ignore lint/style/useShorthandFunctionType: ContextRenderer is an interface that has to be extended
    (req: MightyRenderRequest): Promise<Response>;
  }
}

export function createSidecarApp(
  options?: MightyServerOptions,
): Hono<{
  Variables: {
    shareWithAstroComponent: (data: Record<string, unknown>) => void;
  };
}> {
  const app = new Hono().use(startMightyServer({
    ...options,
    config: mergeConfig(options?.config ?? {}, {
      vite: {
        server: {
          cors: {
            origin: [
              /^https?:\/\/(?:(?:[^:]+\.)?localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/,
              /^https?:\/\/.*\.test(:\d+)?$/,
            ],
          },
        },
      },
    }),
  }));

  app.post("/render", async (c) => {
    const { component, props, context } = await c.req.json<{
      component: string;
      props?: Record<string, unknown>;
      context?: Record<string, unknown>;
    }>();

    const response = await c.render({
      component,
      props: props ?? {},
      context: context ?? {},
    });

    // Return JSON envelope for the PHP client
    const content = await response.text();
    return c.json({ status: response.status, content });
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
