import { createLogger } from "vite";

export function getViteLogger() {
  const logger = createLogger();
  const loggerWarn = logger.warn;

  logger.warn = (msg, options) => {
    // Ignore sourcemap loading error
    // This happens because(?) we are loading the @gomighty/core package inside Vite to get/run the context
    if (
      msg.includes("Failed to load source map") &&
      msg.includes("astro/dist/vite-plugin-astro/index.js")
    )
      return;
    loggerWarn(msg, options);
  };

  return logger;
}
