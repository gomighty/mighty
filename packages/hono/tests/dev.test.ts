import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getFixture } from "./fixture";

describe("dev middleware", () => {
  let fixture: ReturnType<typeof getFixture>;

  describe("basic fixture", () => {
    let stop: () => Promise<void>;

    beforeEach(() => {
      fixture = getFixture("basic");
    });

    afterEach(async () => {
      await stop();
    });

    it("can render an on-demand component", async () => {
      const devApp = fixture.createDevApp();
      stop = devApp.stop;
      const app = devApp.app.get("/", (c) =>
        c.render({ component: "index", props: {} }),
      );

      const res = await app.request("/");
      expect(res.status).toBe(200);
      expect(await res.text()).toContain("<p>Hello World!</p>");
    });

    it("returns 404 for a non-existent component", async () => {
      const devApp = fixture.createDevApp();
      stop = devApp.stop;
      const app = devApp.app.get("/", (c) =>
        c.render({ component: "non-existent", props: {} }),
      );

      const res = await app.request("/");
      expect(res.status).toBe(404);
    });

    it("can render with no explicit props", async () => {
      const devApp = fixture.createDevApp();
      stop = devApp.stop;
      const app = devApp.app.get("/", (c) => c.render({ component: "index" }));

      const res = await app.request("/");
      expect(res.status).toBe(200);
    });
  });

  describe("shared data", () => {
    let stop: () => Promise<void>;

    beforeEach(() => {
      fixture = getFixture("context");
    });

    afterEach(async () => {
      await stop();
    });

    it("passes shared data to the rendered component", async () => {
      const devApp = fixture.createDevApp();
      stop = devApp.stop;
      const app = devApp.app.get("/", (c) => {
        c.var.shareWithAstroComponent({ user: "alice" });
        return c.render({ component: "index", props: {} });
      });

      const res = await app.request("/");
      expect(res.status).toBe(200);
      expect(await res.text()).toContain(
        "<p>Context: {&quot;user&quot;:&quot;alice&quot;}</p>",
      );
    });

    it("sharedData does not bleed across requests", async () => {
      const devApp = fixture.createDevApp();
      stop = devApp.stop;
      const app = devApp.app
        .get("/a", (c) => {
          c.var.shareWithAstroComponent({ reqId: "a" });
          return c.render({ component: "index", props: {} });
        })
        .get("/b", (c) => {
          c.var.shareWithAstroComponent({ reqId: "b" });
          return c.render({ component: "index", props: {} });
        });

      const [resA, resB] = await Promise.all([
        app.request("/a"),
        app.request("/b"),
      ]);

      expect(await resA.text()).toContain(
        "<p>Context: {&quot;reqId&quot;:&quot;a&quot;}</p>",
      );
      expect(await resB.text()).toContain(
        "<p>Context: {&quot;reqId&quot;:&quot;b&quot;}</p>",
      );
    });
  });
});
