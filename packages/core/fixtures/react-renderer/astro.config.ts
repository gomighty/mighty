import react from "@astrojs/react";
import { defineConfig } from "astro/config";

export default defineConfig({
  devToolbar: {
    enabled: false,
  },
  integrations: [react()],
});
