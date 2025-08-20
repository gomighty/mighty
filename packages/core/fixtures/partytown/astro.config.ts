import partytown from "@astrojs/partytown";
import { defineConfig } from "astro/config";

export default defineConfig({
  devToolbar: {
    enabled: false,
  },
  integrations: [partytown()],
});
