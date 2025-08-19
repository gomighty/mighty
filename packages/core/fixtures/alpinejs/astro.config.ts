import alpinejs from "@astrojs/alpinejs";
import { defineConfig } from "astro/config";

export default defineConfig({
  devToolbar: {
    enabled: false,
  },
  integrations: [alpinejs()],
});
