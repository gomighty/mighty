import type { AstroInlineConfig } from "astro";
import { Hono } from "hono";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mighty } from "../src/server";
import { getFixture } from "./fixture";

describe("mighty server", () => {
  let fixture: ReturnType<typeof getFixture>;
  const originalNodeEnv = process.env.NODE_ENV;

  afterEach(async () => {
    process.env.NODE_ENV = originalNodeEnv;
    await fixture.clean();
  });

  describe("explicit mode", () => {
    beforeEach(async () => {
      fixture = getFixture("basic");
      await fixture.build({ config: { output: "server" } });
    });

    it("uses the provided production mode instead of NODE_ENV", async () => {
      process.env.NODE_ENV = "development";

      const middleware = mighty({
        mode: "production",
        root: fixture.fixtureRoot,
        config: {
          outDir: fixture.outDir,
          logLevel: "warn",
        } satisfies AstroInlineConfig,
      });

      const app = new Hono()
        .use(middleware)
        .get("/", (c) => c.render({ component: "index" }));

      const res = await app.request("/");
      expect(res.status).toBe(200);
      expect(await res.text()).toBe("<p>Hello World!</p>");
    });
  });
});
