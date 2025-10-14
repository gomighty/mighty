import type { AddressInfo } from "node:net";
import type { AstroInlineConfig } from "astro";
import type { Hono } from "hono";
import type { Connect } from "vite";
import type { MightyRenderRequest } from "@/schemas";

export type MightyServerOptions = {
  config?: AstroInlineConfig;
};

export type MightyDevOptions = MightyServerOptions & {
  middlewareMode?: {
    getAddress: () => string;
  };
};

export type MightyStartOptions = MightyServerOptions & {
  middlewareMode?: boolean;
};

export type MightyServer = {
  honoApp: Hono;
  address?: AddressInfo;
  stop: () => Promise<void>;
};

export type MightyDevMiddleware = {
  render: (
    req: MightyRenderRequest,
  ) => Promise<{ status: number; content: string }>;
  viteMiddleware: Connect.Server;
  stop: () => Promise<void>;
};

export type MightyStartMiddleware = {
  render: (
    req: MightyRenderRequest,
  ) => Promise<{ redirectTo: string } | { status: number; content: string }>;
};

export type MightyContext = Record<string, unknown>;
