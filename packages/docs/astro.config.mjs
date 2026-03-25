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
      customCss: ["./src/styles/custom.css"],
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
          autogenerate: { directory: "guides/hello-world" },
        },
        {
          label: "Core Concepts",
          autogenerate: { directory: "guides/core-concepts" },
        },
        {
          label: "Backend Adapters",
          autogenerate: { directory: "guides/backend-adapters" },
        },
        {
          slug: "guides/roadmap",
        },
      ],
    }),
  ],
});
