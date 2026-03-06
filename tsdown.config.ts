import { defineConfig } from "tsdown";

export default defineConfig({
  workspace: ["packages/*", "packages/laravel/js"],
});
