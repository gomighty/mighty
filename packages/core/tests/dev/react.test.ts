import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { type DevRenderFunction, getFixture } from "@tests/fixture";
import { getContentFromMatchingTags } from "@tests/utils";

describe("dev react fixture", () => {
  let render: DevRenderFunction;
  let stop: () => Promise<void>;

  const fixture = getFixture("dev.react-renderer");

  beforeEach(async () => {
    ({ render, stop } = await fixture.startDevServer());
  });

  afterEach(async () => {
    await stop();
  });

  it("can render a react component", async () => {
    const response = await render({
      component: "basic",
      props: {
        title: "Hello World",
      },
      context: {},
      partial: true,
    });

    expect(response.status).toBe(200);
    expect(response.content).toBe(
      '<h1>Hello World</h1><button type="button">0</button>',
    );
  });

  it("can render a react component and hydrate it", async () => {
    const response = await render({
      component: "clientload",
      props: {
        title: "Hello World",
      },
      context: {},
      partial: true,
    });

    expect(response.status).toBe(200);

    const astroIslandContent = getContentFromMatchingTags({
      html: response.content,
      tag: "astro-island",
      fragment: true,
    });

    expect(astroIslandContent.length).toBe(1);
    expect(astroIslandContent[0]).toContain(
      '<h1>Hello World</h1><button type="button">0</button>',
    );
  });
});
