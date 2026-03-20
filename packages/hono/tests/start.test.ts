import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getFixture } from "./fixture";

describe("start middleware", () => {
  let fixture: ReturnType<typeof getFixture>;

  describe("basic fixture", () => {
    beforeEach(async () => {
      fixture = getFixture("basic");
      await fixture.build({ config: { output: "server" } });
    });

    afterEach(async () => {
      await fixture.clean();
    });

    it("can render an on-demand component", async () => {
      const startApp = fixture.createStartApp();
      const app = startApp.app.get("/", (c) =>
        c.render({ component: "index", props: {} }),
      );
      const res = await app.request("/");
      expect(res.status).toBe(200);
      expect(await res.text()).toBe("<p>Hello World!</p>");
    });

    it("returns 404 for a non-existent component", async () => {
      const startApp = fixture.createStartApp();
      const app = startApp.app.get("/", (c) =>
        c.render({ component: "non-existent", props: {} }),
      );

      const res = await app.request("/");
      expect(res.status).toBe(404);
    });
  });

  describe("prerendered fixture", () => {
    beforeEach(async () => {
      fixture = getFixture("basic");
      await fixture.build({ config: { output: "static" } });
    });

    afterEach(async () => {
      await fixture.clean();
    });

    it("redirects for a prerendered page", async () => {
      const startApp = fixture.createStartApp();
      const app = startApp.app.get("/", (c) =>
        c.render({ component: "index", props: {} }),
      );

      const res = await app.request("/", { redirect: "manual" });
      expect(res.status).toBe(302);
      expect(res.headers.get("Location")).toBe("/index.html");
    });
  });

  describe("shared data", () => {
    beforeEach(async () => {
      fixture = getFixture("context");
      await fixture.build({ config: { output: "server" } });
    });

    afterEach(async () => {
      await fixture.clean();
    });

    it("passes shared data to the rendered component", async () => {
      const startApp = fixture.createStartApp();
      const app = startApp.app.get("/", (c) => {
        c.var.share({ user: "alice" });
        return c.render({ component: "index", props: {} });
      });

      const res = await app.request("/");
      expect(res.status).toBe(200);
      expect(await res.text()).toBe(
        "<p>Context: {&quot;user&quot;:&quot;alice&quot;}</p>",
      );
    });

    it("sharedData does not bleed across requests", async () => {
      const startApp = fixture.createStartApp();
      const app = startApp.app
        .get("/a", (c) => {
          c.var.share({ reqId: "a" });
          return c.render({ component: "index", props: {} });
        })
        .get("/b", (c) => {
          c.var.share({ reqId: "b" });
          return c.render({ component: "index", props: {} });
        });

      const [resA, resB] = await Promise.all([
        app.request("/a"),
        app.request("/b"),
      ]);

      expect(await resA.text()).toBe(
        "<p>Context: {&quot;reqId&quot;:&quot;a&quot;}</p>",
      );
      expect(await resB.text()).toBe(
        "<p>Context: {&quot;reqId&quot;:&quot;b&quot;}</p>",
      );
    });

    it("accumulates multiple share calls", async () => {
      const startApp = fixture.createStartApp();
      const app = startApp.app.get("/", (c) => {
        c.var.share({ user: "alice" });
        c.var.share({ theme: "dark" });
        return c.render({ component: "index", props: {} });
      });

      const res = await app.request("/");
      expect(res.status).toBe(200);

      const text = await res.text();
      expect(text).toContain("&quot;user&quot;:&quot;alice&quot;");
      expect(text).toContain("&quot;theme&quot;:&quot;dark&quot;");
    });
  });

  describe("error cases", () => {
    it("cannot start without building first", async () => {
      fixture = getFixture("basic");
      const startApp = fixture.createStartApp();
      const app = startApp.app.get("/", (c) =>
        c.render({ component: "index", props: {} }),
      );

      const res = await app.request("/");
      expect(res.status).toBe(500);
    });
  });
});
