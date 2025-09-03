import type { AddressInfo } from "node:net";
import type { AstroInlineConfig } from "astro";
import type { Hono } from "hono";

export type MightyServerOptions = {
  config?: AstroInlineConfig;
};

export type MightyDevOptions = MightyServerOptions & {
  middlewareMode?: boolean;
};

export type MightyMiddlewareServer = {
  honoApp: Hono;
  stop: () => Promise<void>;
};

export type MightyStandaloneServer = {
  honoApp: Hono;
  address: AddressInfo;
  stop: () => Promise<void>;
};

export type MightyServer = MightyMiddlewareServer | MightyStandaloneServer;

export type MightyContext = Record<string, unknown>;
