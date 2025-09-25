import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { type AppRequestFunction, getFixture } from "@tests/fixture";

describe("dev alpinejs fixture", () => {
  let request: AppRequestFunction;
  let stop: () => Promise<void>;

  const fixture = getFixture("dev.alpinejs");

  beforeEach(async () => {
    ({ request, stop } = await fixture.startDevServer());
  });

  afterEach(async () => {
    await stop();
  });

  it("can render a page with alpinejs", async () => {
    const response = await request("/render", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        component: "basic",
        props: {
          initialCount: 0,
        },
        partial: false,
      }),
    });

    expect(response.status).toBe(200);

    const output = await response.text();

    expect(output).toContain(
      '<script type="module" src="http://host-placeholder.test/@id/astro:scripts/page.js"></script>',
    );

    const scriptResponse = await request("/@id/astro:scripts/page.js", {
      headers: { host: "localhost" },
    });
    expect(scriptResponse.status).toBe(200);
    const scriptContent = await scriptResponse.text();
    expect(scriptContent).toContain("Alpine.start()");
  });
});
