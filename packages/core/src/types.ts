import type { AddressInfo } from "node:net";
import type { AstroInlineConfig } from "astro";

export type MightyServerOptions = {
  config?: AstroInlineConfig;
};

export type MightyServer = {
  address: AddressInfo;
  stop: () => Promise<void>;
};
