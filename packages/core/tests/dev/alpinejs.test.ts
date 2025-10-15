import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import {
  type DevRenderFunction,
  type GetFromViteMiddlewareFunction,
  getFixture,
} from "@tests/fixture";

describe("dev alpinejs fixture", () => {
  let render: DevRenderFunction;
  let getFromViteMiddleware: GetFromViteMiddlewareFunction;
  let stop: () => Promise<void>;

  const fixture = getFixture("dev.alpinejs");

  beforeEach(async () => {
    ({ render, getFromViteMiddleware, stop } = await fixture.startDevServer());
  });

  afterEach(async () => {
    await stop();
  });

  it("can render a page with alpinejs", async () => {
    const response = await render({
      component: "basic",
      props: {
        initialCount: 0,
      },
      context: {},
      partial: false,
    });
    expect(response.status).toBe(200);
    expect(response.content).toContain(
      '<script type="module" src="http://host-placeholder.test/@id/astro:scripts/page.js"></script>',
    );

    const scriptResponse = await getFromViteMiddleware(
      "/@id/astro:scripts/page.js",
    );
    expect(scriptResponse?.status).toBe(200);
    const scriptContent = await scriptResponse?.text();
    expect(scriptContent).toContain("Alpine.start()");
  });
});
