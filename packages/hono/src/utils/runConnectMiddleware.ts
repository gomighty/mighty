import { toFetchResponse, toReqRes } from "fetch-to-node";
import type { Context } from "hono";
import type { Connect } from "vite";

export function runConnectMiddleware(
  middleware: Connect.Server,
  c: Context,
): Promise<Response | undefined> {
  const { req, res } = toReqRes(c.req.raw);
  Object.defineProperty(req, "socket", {
    value: {},
  });

  return new Promise<Response | undefined>((resolve, reject) => {
    middleware(req, res, (err: unknown) => {
      if (err) reject(err);
      else resolve(undefined);
    });
    toFetchResponse(res).then(resolve);
  });
}
