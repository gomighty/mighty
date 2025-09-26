import { afterEach, describe, expect, it } from "bun:test";
import path from "node:path";
import { getFixture } from "@tests/fixture";
import { getContentFromMatchingTags, getMatchingTags } from "@tests/utils";

describe("start basic fixture", () => {
  const fixture = getFixture("start.basic");

  afterEach(async () => {
    await fixture.clean();
  });

  it("cannot start a prod server without building", async () => {
    expect(fixture.startProdServer()).rejects.toThrowError();
  });

  it("can start a prod server", async () => {
    await fixture.build();
    const { request } = await fixture.startProdServer();
    const response = await request("/thisRouteDoesNotExist");
    expect(response.status).toBe(404);
  });

  it("can render a prerendered page", async () => {
    await fixture.build();
    const { request } = await fixture.startProdServer();

    const response = await request("/render", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        component: "index",
      }),
    });
    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toBe("index.html");

    const redirectResponse = await request("index.html");
    const output = await redirectResponse.text();

    expect(output).toBe("<!DOCTYPE html><p>Hello World!</p>");
  });

  it("can render an on-demand component", async () => {
    await fixture.build({ config: { output: "server" } });
    const { request } = await fixture.startProdServer();

    const response = await request("/render", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        component: "index",
        partial: true,
      }),
    });
    expect(response.status).toBe(200);

    const output = await response.text();

    expect(output).toBe("<p>Hello World!</p>");
  });

  it("can render an on-demand page", async () => {
    await fixture.build({ config: { output: "server" } });
    const { request } = await fixture.startProdServer();

    const response = await request("/render", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        component: "page",
        partial: false,
      }),
    });
    expect(response.status).toBe(200);

    const output = await response.text();

    expect(output).toBe(
      "<!DOCTYPE html><html><head></head> <body> <p>Hello World!</p> </body></html>",
    );
  });

  it("can render a component with props", async () => {
    await fixture.build({ config: { output: "server" } });
    const { request } = await fixture.startProdServer();

    const response = await request("/render", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        component: "props",
        props: {
          title: "This is a prop!",
        },
      }),
    });
    expect(response.status).toBe(200);

    const output = await response.text();

    expect(output).toBe("<p>This is a prop!</p>");
  });

  it("can render an img tag and serve images", async () => {
    await fixture.build({ config: { output: "server" } });
    const { request } = await fixture.startProdServer();

    const response = await request("/render", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        component: "imgTag",
      }),
    });
    expect(response.status).toBe(200);

    const output = await response.text();

    const imageSrc = output.match(
      /<img src="([^"]+)" width="96" height="96">/,
    )?.[1] as string;
    expect(imageSrc).toStartWith("/_astro/");

    const imageResponse = await request(imageSrc);
    expect(imageResponse.status).toBe(200);
    expect(imageResponse.headers.get("Content-Type")).toBe("image/png");
    expect(imageResponse.text()).resolves.toBe(
      await Bun.file(
        path.join(fixture.fixtureRoot, "src", "assets", "sample.png"),
      ).text(),
    );
  });

  it("can render a prerendered page with inline styles", async () => {
    await fixture.build({
      config: {
        output: "static",
        vite: { build: { assetsInlineLimit: 4096 } },
      },
    });
    const { request } = await fixture.startProdServer();

    const response = await request("/render", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        component: "styles",
        partial: false,
      }),
    });
    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toBe("styles/index.html");

    const redirectResponse = await request("styles/index.html");
    const output = await redirectResponse.text();

    const styleContent = getContentFromMatchingTags({
      html: output,
      tag: "style",
      fragment: false,
    });
    expect(styleContent.length).toBe(1);
    expect(styleContent[0]).toMatch(/p\[data-astro-cid-.+\]\{color:red\}/);
  });

  it("can render a prerendered page with external styles", async () => {
    await fixture.build({
      config: { output: "static", vite: { build: { assetsInlineLimit: 0 } } },
    });
    const { request } = await fixture.startProdServer();

    const response = await request("/render", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        component: "styles",
        partial: false,
      }),
    });

    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toBe("styles/index.html");

    const redirectResponse = await request("styles/index.html");
    const output = await redirectResponse.text();

    const matchingTags = getMatchingTags({
      html: output,
      tag: "link",
      fragment: false,
    });
    expect(matchingTags.length).toBe(1);

    const linkHref = matchingTags[0]?.properties.href as string;
    expect(linkHref).toMatch(/_astro\/.+\.css/);

    const styleResponse = await request(linkHref);
    expect(styleResponse.status).toBe(200);
    expect(styleResponse.headers.get("Content-Type")).toContain("text/css");
    expect(await styleResponse.text()).toMatch(
      /p\[data-astro-cid-.+\]\{color:red\}/,
    );
  });

  it("can render an on-demand page with inline styles", async () => {
    await fixture.build({
      config: {
        output: "server",
        vite: { build: { assetsInlineLimit: 4096 } },
      },
    });
    const { request } = await fixture.startProdServer();

    const response = await request("/render", {
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

    const styleContent = getContentFromMatchingTags({
      html: output,
      tag: "style",
      fragment: false,
    });
    expect(styleContent.length).toBe(1);
    expect(styleContent[0]).toMatch(/p\[data-astro-cid-.+\]\{color:red\}/);
  });

  it("can render an on-demand page with external styles", async () => {
    await fixture.build({
      config: { output: "server", vite: { build: { assetsInlineLimit: 0 } } },
    });
    const { request } = await fixture.startProdServer();

    const response = await request("/render", {
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

    const matchingTags = getMatchingTags({
      html: output,
      tag: "link",
      fragment: false,
    });
    expect(matchingTags.length).toBe(1);

    const linkHref = matchingTags[0]?.properties.href as string;
    expect(linkHref).toMatch(/_astro\/.+\.css/);

    const styleResponse = await request(linkHref);
    expect(styleResponse.status).toBe(200);
    expect(styleResponse.headers.get("Content-Type")).toContain("text/css");
    expect(await styleResponse.text()).toMatch(
      /p\[data-astro-cid-.+\]\{color:red\}/,
    );
  });
});
