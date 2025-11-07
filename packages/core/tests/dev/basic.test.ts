import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { type DevRenderFunction, getFixture } from "@tests/fixture";
import { getContentFromMatchingTags } from "@tests/utils";
import "@tests/custom-matchers";

describe("dev basic fixture", () => {
  let render: DevRenderFunction;
  let stop: () => Promise<void>;

  const fixture = getFixture("dev.basic");

  beforeEach(async () => {
    ({ render, stop } = await fixture.startDevServer());
  });

  afterEach(async () => {
    await stop();
  });

  it("can render a partial", async () => {
    const response = await render({
      component: "index",
      props: {
        title: "Hello World",
      },
      context: {},
      partial: true,
    });
    expect(response.status).toBe(200);
    expect(response.content).toBe("<p>Hello World</p>");
  });

  it("renders a partial by default", async () => {
    const response = await render({
      component: "index",
      props: {
        title: "Hello World",
      },
      context: {},
    });
    expect(response.status).toBe(200);
    expect(response.content).toBe("<p>Hello World</p>");
  });

  it("can render a partial with dot notation", async () => {
    const response = await render({
      component: "nested.index",
      props: {
        title: "Hello World",
      },
      context: {},
      partial: true,
    });
    expect(response.status).toBe(200);
    expect(response.content).toBe("<p>Hello World</p>");
  });

  it("returns 404 for a non-existent component", async () => {
    const response = await render({
      component: "non-existent",
      props: {},
      context: {},
      partial: true,
    });
    expect(response.status).toBe(404);
    expect(response.content).toBe("Component non-existent not found");
  });

  it("can render a page", async () => {
    const response = await render({
      component: "page",
      props: {
        title: "Hello World",
      },
      context: {},
      partial: false,
    });
    expect(response.status).toBe(200);

    expect(response.content).toBe(
      '<!DOCTYPE html><html><head><script type="module" src="http://host-placeholder.test/@vite/client"></script></head> <body> <p>Hello World</p> </body></html>',
    );
  });

  it("can render a page with styles", async () => {
    const response = await render({
      component: "styles",
      props: {},
      context: {},
      partial: false,
    });
    expect(response.status).toBe(200);
    expect(response.content).toContain(
      '<script type="module" src="http://host-placeholder.test/@vite/client"></script>',
    );

    const styleContent = getContentFromMatchingTags({
      html: response.content,
      tag: "style",
      fragment: false,
    });
    expect(styleContent.length).toBe(1);
    expect(styleContent[0]).toMatch(/p\[data-astro-cid-.+\]\{color:red\}/);
  });

  it("can render a page with styles from a child component", async () => {
    const response = await render({
      component: "stylesWithChild",
      props: {},
      context: {},
      partial: false,
    });
    expect(response.status).toBe(200);

    expect(response.content).toContain(
      '<script type="module" src="http://host-placeholder.test/@vite/client"></script>',
    );

    const styleContent = getContentFromMatchingTags({
      html: response.content,
      tag: "style",
      fragment: false,
    });
    expect(styleContent).arrayMatching([
      /p\[data-astro-cid-.+\]\{color:blue\}/,
      /p\[data-astro-cid-.+\]\{color:red\}/,
    ]);
  });

  it("can render a component with context", async () => {
    const response = await render({
      component: "context",
      props: {},
      context: {
        notifications: ["Hello World"],
        user: {
          id: 1,
        },
      },
      partial: true,
    });
    expect(response.status).toBe(200);
    expect(response.content).toContain(
      "<p>Context: {&quot;notifications&quot;:[&quot;Hello World&quot;],&quot;user&quot;:{&quot;id&quot;:1}}</p>",
    );
  });
});
