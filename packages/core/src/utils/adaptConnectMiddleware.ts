import { toFetchResponse, toReqRes } from "fetch-to-node";
import { createMiddleware } from "hono/factory";
import type { Connect } from "vite";

export const adaptConnectMiddleware = (middleware: Connect.Server) =>
  createMiddleware(async (c, next) => {
    const { req, res } = toReqRes(c.req.raw);
    Object.defineProperty(req, "socket", {
      value: {},
    });

    const middlewareResponse = await new Promise<Response | undefined>(
      (resolve, reject) => {
        middleware(req, res, (err: unknown) => {
          if (err) reject(err);
          else resolve(undefined);
        });
        toFetchResponse(res).then(resolve);
      },
    );

    if (middlewareResponse) {
      return middlewareResponse;
    }

    await next();
  });
