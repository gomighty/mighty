// @ts-check

import starlight from "@astrojs/starlight";
import { defineConfig } from "astro/config";
import starlightLinksValidator from "starlight-links-validator";

// https://astro.build/config
export default defineConfig({
  experimental: {
    clientPrerender: true,
  },
  integrations: [
    starlight({
      title: "Mighty",
      plugins: [starlightLinksValidator()],
      logo: {
        src: "@/assets/mighty.svg",
      },
      components: {
        SiteTitle: "@/components/starlight/SiteTitle.astro",
        Hero: "@/components/starlight/Hero.astro",
      },
      expressiveCode: {
        styleOverrides: {
          // Frame cosmetics only — Night Owl (Starlight's default theme) carries
          // the syntax palette untouched. We just round the corners, soften the
          // shadow, and tint the chrome to the brand.
          borderRadius: "0.6rem",
          borderColor: "var(--sl-color-gray-5)",
          frames: {
            // Let `frameBoxShadowCssValue` own the shadow entirely.
            shadowColor: "transparent",
            frameBoxShadowCssValue: "0 24px 60px -34px rgba(0, 0, 0, 0.5)",
            // Active code-tab indicator picks up the magenta brand pop.
            editorActiveTabIndicatorTopColor: "var(--mty-magenta-hot)",
            editorActiveTabIndicatorBottomColor: "transparent",
            editorTabBarBorderBottomColor: "var(--sl-color-gray-5)",
            // Copy button tinted to the neutral surface tokens.
            inlineButtonBorder: "var(--sl-color-gray-5)",
          },
        },
      },
      customCss: [
        // Display typeface — Fraunces (variable: weight + optical-size axes,
        // upright + italic). Body/mono stay on Starlight's system stacks.
        "@fontsource-variable/fraunces/standard.css",
        "@fontsource-variable/fraunces/standard-italic.css",
        "./src/styles/custom.css",
      ],
      social: [
        {
          icon: "github",
          label: "GitHub",
          href: "https://github.com/gomighty/mighty",
        },
      ],
      head: [
        {
          tag: "link",
          attrs: {
            rel: "icon",
            type: "image/png",
            href: "/favicon-96x96.png",
            sizes: "96x96",
          },
        },
      ],
      sidebar: [
        {
          label: "Hello, World!",
          items: [{ autogenerate: { directory: "guides/hello-world" } }],
        },
        {
          label: "Core Concepts",
          items: [{ autogenerate: { directory: "guides/core-concepts" } }],
        },
        {
          label: "Backend Adapters",
          items: [{ autogenerate: { directory: "guides/backend-adapters" } }],
        },
        {
          slug: "guides/roadmap",
        },
      ],
    }),
  ],
});
