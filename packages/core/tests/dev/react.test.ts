import {
  type DevRenderFunction,
  type GetFromViteMiddlewareFunction,
  getFixture,
} from "@tests/fixture";
import { getContentFromMatchingTags, getMatchingTags } from "@tests/utils";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

describe("dev react fixture", () => {
  let render: DevRenderFunction;
  let getFromViteMiddleware: GetFromViteMiddlewareFunction;
  let stop: () => Promise<void>;

  let fixture: ReturnType<typeof getFixture>;

  beforeEach(async () => {
    fixture = getFixture("dev.react-renderer");
    ({ render, getFromViteMiddleware, stop } = await fixture.startDevServer());
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

    // Verify the hydration component-url is fetchable (not 404)
    const astroIslands = getMatchingTags({
      html: response.content,
      tag: "astro-island",
      fragment: true,
    });
    const componentUrl = astroIslands[0]?.properties?.["component-url"] as
      | string
      | undefined;
    expect(componentUrl).toBeDefined();

    const urlPath = componentUrl!.replace("http://host-placeholder.test", "");
    const scriptResponse = await getFromViteMiddleware(urlPath);
    expect(scriptResponse?.status).toBe(200);
  });
});
