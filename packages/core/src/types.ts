import type { AstroInlineConfig } from "astro";
import type { Connect } from "vite";

export type MightyServerOptions = {
  /**
   * The Astro inline configuration to use.
   *
   * Astro configuration files (e.g. `astro.config.ts`) under the project root (specified by the `root` option) will be merged with this configuration and the Mighty default configuration.
   *
   * @see https://docs.astro.build/en/reference/programmatic-reference/#astroinlineconfig
   */
  config?: AstroInlineConfig;
};

export type MightyDevOptions = MightyServerOptions & {
  /**
   * Specifies the address the Mighty development server will be available at.
   *
   * This is used to get correct paths for client-side assets.
   */
  getAddress: () => string;
  /**
   * Whether to show the Mighty error page when an error occurs.
   * @default true
   */
  showErrorPage?: boolean;
};

export type MightyStartOptions = MightyServerOptions;

export type MightyRenderRequest = {
  /**
   * The path of the Astro component to render, in dot notation.
   *
   * @example "posts.index"
   */
  component: string;
  /**
   * An object containing the props to pass to the Astro component.
   */
  props: Record<string, unknown>;
  /**
   * An object containing additional request data.
   *
   * This can be used to pass shared data that you want to pass to all components, or backend-related info (e.g. user data).
   */
  context: Record<string, unknown>;
  /** @default true */
  partial?: boolean;
};

export type MightyDevMiddleware = {
  /** Renders an Astro component. */
  render: (
    req: MightyRenderRequest,
  ) => Promise<{ status: number; content: string }>;
  /**
   * The Connect middleware provider by the Vite/Astro development server.
   *
   * This should be used to serve client-side assets during development.
   */
  viteMiddleware: Connect.Server;
  /** Stops the Mighty development server. */
  stop: () => Promise<void>;
};

export type MightyStartMiddleware = {
  /** Renders an Astro component. */
  render: (
    req: MightyRenderRequest,
  ) => Promise<{ redirectTo: string } | { status: number; content: string }>;
};

export type MightyContext = Record<string, unknown>;
