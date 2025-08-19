import { getContentFromMatchingTags, getFixture } from "@tests/utils";
import type { Hono } from "hono";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

describe("dev hono app", () => {
  let app: Hono;
  let stop: () => Promise<void>;

  const fixture = getFixture("basic");

  beforeEach(async () => {
    ({ app, stop } = await fixture.startDevServer());
  });

  afterEach(async () => {
    await stop();
  });

  it("starts a dev server", async () => {
    const response = await app.request("/", {
      headers: { host: "localhost" },
    });
    expect(response.status).toBe(200);
  });

  it("can render a partial", async () => {
    const response = await app.request("/render", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        component: "index",
        props: {
          title: "Hello World",
        },
      }),
    });
    expect(response.status).toBe(200);

    const output = await response.text();

    expect(output).toBe("<p>Hello World</p>");
  });

  it("can render a partial with dot notation", async () => {
    const response = await app.request("/render", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        component: "nested.index",
        props: {
          title: "Hello World",
        },
      }),
    });
    expect(response.status).toBe(200);

    const output = await response.text();

    expect(output).toBe("<p>Hello World</p>");
  });

  it("returns 404 for a non-existent component", async () => {
    const response = await app.request("/render", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        component: "non-existent",
      }),
    });
    expect(response.status).toBe(404);
    expect(await response.text()).toBe("Component non-existent not found");
  });

  it("can render a page", async () => {
    const response = await app.request("/render", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        component: "page",
        props: {
          title: "Hello World",
        },
        partial: false,
      }),
    });
    expect(response.status).toBe(200);

    const output = await response.text();

    expect(output).toBe(
      '<!DOCTYPE html><html><head><script type="module" src="http://host-placeholder.test/@vite/client"></script></head> <body> <p>Hello World</p> </body></html>',
    );
  });

  it("can render a page with styles", async () => {
    const response = await app.request("/render", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        component: "styles",
        partial: false,
      }),
    });
    expect(response.status).toBe(200);

    const output = await response.text();

    expect(output).toContain(
      '<script type="module" src="http://host-placeholder.test/@vite/client"></script>',
    );

    const styleContent = getContentFromMatchingTags({
      html: output,
      tag: "style",
      fragment: false,
    });
    expect(styleContent.length).toBe(1);
    expect(styleContent[0]).toMatch(/p\[data-astro-cid-.+\]\{color:red\}/);
  });

  it("can render a page with styles from a child component", async () => {
    const response = await app.request("/render", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        component: "stylesWithChild",
        partial: false,
      }),
    });
    expect(response.status).toBe(200);

    const output = await response.text();

    expect(output).toContain(
      '<script type="module" src="http://host-placeholder.test/@vite/client"></script>',
    );

    const styleContent = getContentFromMatchingTags({
      html: output,
      tag: "style",
      fragment: false,
    });
    expect(styleContent).arrayMatching([
      /p\[data-astro-cid-.+\]\{color:blue\}/,
      /p\[data-astro-cid-.+\]\{color:red\}/,
    ]);
  });
});

describe("dev react renderer", () => {
  let app: Hono;
  let stop: () => Promise<void>;

  const fixture = getFixture("react-renderer");

  beforeEach(async () => {
    ({ app, stop } = await fixture.startDevServer());
  });

  afterEach(async () => {
    await stop();
  });

  it("can render a react component", async () => {
    const response = await app.request("/render", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        component: "index",
        props: {
          title: "Hello World",
        },
      }),
    });

    expect(response.status).toBe(200);

    const output = await response.text();

    expect(output).toBe('<h1>Hello World</h1><button type="button">0</button>');
  });
});
