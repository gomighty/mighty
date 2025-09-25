import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { type AppRequestFunction, getFixture } from "@tests/fixture";
import { getContentFromMatchingTags } from "@tests/utils";

describe("dev react fixture", () => {
  let request: AppRequestFunction;
  let stop: () => Promise<void>;

  const fixture = getFixture("dev.react-renderer");

  beforeEach(async () => {
    ({ request, stop } = await fixture.startDevServer());
  });

  afterEach(async () => {
    await stop();
  });

  it("can render a react component", async () => {
    const response = await request("/render", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        component: "basic",
        props: {
          title: "Hello World",
        },
      }),
    });

    expect(response.status).toBe(200);

    const output = await response.text();

    expect(output).toBe('<h1>Hello World</h1><button type="button">0</button>');
  });

  it("can render a react component and hydrate it", async () => {
    const response = await request("/render", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        component: "clientload",
        props: {
          title: "Hello World",
        },
      }),
    });

    expect(response.status).toBe(200);

    const output = await response.text();

    const astroIslandContent = getContentFromMatchingTags({
      html: output,
      tag: "astro-island",
      fragment: true,
    });

    expect(astroIslandContent.length).toBe(1);
    expect(astroIslandContent[0]).toContain(
      '<h1>Hello World</h1><button type="button">0</button>',
    );
  });
});
