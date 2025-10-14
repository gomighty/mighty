import { Hono } from "hono";
import type { UnofficialStatusCode } from "hono/utils/http-status";
import { validator } from "hono/validator";
import { MightyRenderRequestSchema } from "@/schemas";
import type { MightyServerOptions } from "@/types";
import { getRuntimeSpecificServeStatic } from "./getRuntimeSpecificServeStatic";
import { setupStart } from "./setup";

export async function createProdHonoApp(options: MightyServerOptions): Promise<{
  app: Hono;
}> {
  const { render } = await setupStart({
    options,
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
      const response = await render(c.req.valid("json"));
      if ("redirectTo" in response) {
        return c.redirect(response.redirectTo);
      }
      return c.html(response.content, response.status as UnofficialStatusCode);
    },
  );

  app.use("*", await getRuntimeSpecificServeStatic(options));

  return { app };
}
