import { Hono } from "hono";
import { cors } from "hono/cors";
import type { UnofficialStatusCode } from "hono/utils/http-status";
import { validator } from "hono/validator";
import { getRuntimeConnInfo } from "@/runtime";
import { MightyRenderRequestSchema } from "@/schemas";
import type { MightyServerOptions } from "@/types";
import { adaptConnectMiddleware } from "@/utils/adaptConnectMiddleware";
import { setupDev } from "./setup";

export async function createDevHonoApp(options: MightyServerOptions): Promise<{
  app: Hono;
  stop: () => Promise<void>;
}> {
  let getAddressFromHono: () => string = () => "";

  const { render, viteMiddleware, stop } = await setupDev({
    options,
    getAddress: () => getAddressFromHono(),
  });

  const app = new Hono();
  app.use(cors());
  app.use(async (c, next) => {
    const connInfo = await getRuntimeConnInfo(c);
    getAddressFromHono = () => connInfo.remote.address ?? "";
    await next();
  });

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
      const response = await render(c.req.valid("json"));
      return c.html(response.content, response.status as UnofficialStatusCode);
    },
  );

  app.use(adaptConnectMiddleware(viteMiddleware));

  return { app, stop };
}
