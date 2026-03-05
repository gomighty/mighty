import { createApp } from "astro/app/entrypoint";

const app = createApp();
export const manifest = app.manifest;
export default app;
