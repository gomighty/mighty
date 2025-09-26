import type { AddressInfo } from "node:net";
import type { AstroInlineConfig } from "astro";
import type { Hono } from "hono";

export type MightyServerOptions = {
  config?: AstroInlineConfig;
};

export type MightyDevAndStartOptions = MightyServerOptions & {
  middlewareMode?: boolean;
};

export type MightyServer = {
  honoApp: Hono;
  address?: AddressInfo;
  stop: () => Promise<void>;
};

export type MightyContext = Record<string, unknown>;
