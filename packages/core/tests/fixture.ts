import { rm } from "node:fs/promises";
import path from "node:path";
import { createDevHonoApp } from "@/dev/app";
import type { MightyServerOptions } from "@/types";

export type AppRequestFunction = (
  input: string | URL,
  requestInit?: RequestInit,
) => Promise<Response>;

export function getFixture(fixtureName: string) {
  const fixtureRoot = path.join(__dirname, "..", "fixtures", fixtureName);

  return {
    startDevServer: async (params?: MightyServerOptions) => {
      const { app, viteServer } = await createDevHonoApp({
        config: {
          root: fixtureRoot,
          logLevel: "warn",
          ...params,
        },
      });

      const request: AppRequestFunction = async (input, requestInit) => {
        return app.request(input, requestInit, {
          incoming: {
            socket: {
              remoteAddress: "http://host-placeholder.test",
              remoteFamily: "IPv4",
              remotePort: 80,
            },
          },
        });
      };

      return {
        app,
        request,
        stop: async () => {
          await viteServer.close();
          await rm(path.join(fixtureRoot, ".astro"), {
            recursive: true,
            force: true,
          });
          await rm(path.join(fixtureRoot, "node_modules"), {
            recursive: true,
            force: true,
          });
        },
      };
    },
  };
}
