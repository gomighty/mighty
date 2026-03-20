import { type DevRenderFunction, getFixture } from "@tests/fixture";
import { getContentFromMatchingTags } from "@tests/utils";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import "@tests/custom-matchers";

describe("dev basic fixture", () => {
  let render: DevRenderFunction;
  let stop: () => Promise<void>;

  let fixture: ReturnType<typeof getFixture>;

  beforeEach(async () => {
    fixture = getFixture("dev.basic");
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

  it("can render with no explicit props or context", async () => {
    const response = await render({ component: "index" });
    expect(response.status).toBe(200);
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

  it("rewrites image /@fs/ URLs to include the dev address", async () => {
    const response = await render({
      component: "imgTag",
      props: {},
      context: {},
      partial: true,
    });
    expect(response.status).toBe(200);

    const imageSrc = response.content.match(/<img src="([^"]+)"/)?.[1];
    expect(imageSrc).toBeDefined();
    // The /@fs/ URL must be prefixed with the dev address so the browser
    // routes the request to the Vite dev server, not the app server.
    expect(imageSrc).toMatch(
      /^http:\/\/host-placeholder\.test\/@fs\/.+sample\.png/,
    );
    // Verify it's not a bare /@fs/ URL (which would cause a 404).
    expect(imageSrc).not.toMatch(/^"?\/@fs\//);
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
