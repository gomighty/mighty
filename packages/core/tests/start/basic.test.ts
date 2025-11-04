import { afterEach, describe, expect, it } from "bun:test";
import path from "node:path";
import { getFixture } from "@tests/fixture";
import { getContentFromMatchingTags, getMatchingTags } from "@tests/utils";

describe("start basic fixture", () => {
  const fixture = getFixture("start.basic");

  afterEach(async () => {
    await fixture.clean();
  });

  it("can render a prerendered page", async () => {
    await fixture.build();
    const { render } = await fixture.startProdServer();

    const response = await render({
      component: "index",
      props: {},
      context: {},
      partial: true,
    });
    expect(response).toEqual({ redirectTo: "index.html" });

    expect(
      await Bun.file(
        path.join(fixture.fixtureRoot, "dist", "client", "index.html"),
      ).text(),
    ).toBe("<!DOCTYPE html><p>Hello World!</p>");
  });

  it("can render an on-demand component", async () => {
    await fixture.build({ config: { output: "server" } });
    const { render } = await fixture.startProdServer();

    const response = await render({
      component: "index",
      props: {},
      context: {},
      partial: true,
    });
    expect(response).toEqual({ status: 200, content: "<p>Hello World!</p>" });
  });

  it("can render an on-demand page", async () => {
    await fixture.build({ config: { output: "server" } });
    const { render } = await fixture.startProdServer();

    const response = await render({
      component: "page",
      props: {},
      context: {},
      partial: false,
    });
    expect(response).toEqual({
      status: 200,
      content:
        "<!DOCTYPE html><html><head></head> <body> <p>Hello World!</p> </body></html>",
    });
  });

  it("can render a component with props", async () => {
    await fixture.build({ config: { output: "server" } });
    const { render } = await fixture.startProdServer();

    const response = await render({
      component: "props",
      props: {
        title: "This is a prop!",
      },
      context: {},
      partial: true,
    });
    expect(response).toEqual({
      status: 200,
      content: "<p>This is a prop!</p>",
    });
  });

  it("can render an img tag and serve images", async () => {
    await fixture.build({ config: { output: "server" } });
    const { render } = await fixture.startProdServer();

    const response = (await render({
      component: "imgTag",
      props: {},
      context: {},
      partial: true,
    })) as { status: number; content: string };
    expect(response.status).toBe(200);

    const imageSrc = response.content.match(
      /<img src="([^"]+)" width="96" height="96">/,
    )?.[1] as string;
    expect(imageSrc).toStartWith("/_astro/");

    expect(
      Bun.file(
        path.join(fixture.fixtureRoot, "dist", "client", imageSrc),
      ).text(),
    ).resolves.toBe(
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
    const { render } = await fixture.startProdServer();

    const response = await render({
      component: "styles",
      props: {},
      context: {},
      partial: false,
    });
    expect(response).toEqual({ redirectTo: "styles/index.html" });

    const output = await Bun.file(
      path.join(fixture.fixtureRoot, "dist", "client", "styles", "index.html"),
    ).text();

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
    const { render } = await fixture.startProdServer();

    const response = await render({
      component: "styles",
      props: {},
      context: {},
      partial: false,
    });
    expect(response).toEqual({ redirectTo: "styles/index.html" });

    const output = await Bun.file(
      path.join(fixture.fixtureRoot, "dist", "client", "styles", "index.html"),
    ).text();

    const matchingTags = getMatchingTags({
      html: output,
      tag: "link",
      fragment: false,
    });
    expect(matchingTags.length).toBe(1);

    const linkHref = matchingTags[0]?.properties.href as string;
    expect(linkHref).toMatch(/_astro\/.+\.css/);

    expect(
      Bun.file(
        path.join(fixture.fixtureRoot, "dist", "client", linkHref),
      ).text(),
    ).resolves.toMatch(/p\[data-astro-cid-.+\]\{color:red\}/);
  });

  it("can render an on-demand page with inline styles", async () => {
    await fixture.build({
      config: {
        output: "server",
        vite: { build: { assetsInlineLimit: 4096 } },
      },
    });
    const { render } = await fixture.startProdServer();

    const response = (await render({
      component: "styles",
      props: {},
      context: {},
      partial: false,
    })) as { status: number; content: string };
    expect(response.status).toBe(200);

    const styleContent = getContentFromMatchingTags({
      html: response.content,
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
    const { render } = await fixture.startProdServer();

    const response = (await render({
      component: "styles",
      props: {},
      context: {},
      partial: false,
    })) as { status: number; content: string };
    expect(response.status).toBe(200);

    const matchingTags = getMatchingTags({
      html: response.content,
      tag: "link",
      fragment: false,
    });
    expect(matchingTags.length).toBe(1);

    const linkHref = matchingTags[0]?.properties.href as string;
    expect(linkHref).toMatch(/_astro\/.+\.css/);

    expect(
      Bun.file(
        path.join(fixture.fixtureRoot, "dist", "client", linkHref),
      ).text(),
    ).resolves.toMatch(/p\[data-astro-cid-.+\]\{color:red\}/);
  });

  it("can render a prerendered page with an inline script", async () => {
    await fixture.build({
      config: {
        output: "static",
        vite: { build: { assetsInlineLimit: 4096 } },
      },
    });
    const { render } = await fixture.startProdServer();

    const response = await render({
      component: "scriptTag",
      props: {},
      context: {},
      partial: false,
    });
    expect(response).toEqual({ redirectTo: "scriptTag/index.html" });

    const output = await Bun.file(
      path.join(
        fixture.fixtureRoot,
        "dist",
        "client",
        "scriptTag",
        "index.html",
      ),
    ).text();

    expect(output).toContain('<script type="module">');
    expect(output).toContain("Hello World!");
    expect(output).toContain("console.log");
    expect(output).toContain("</script>");
  });

  it("can render a prerendered page with an external script", async () => {
    await fixture.build({
      config: { output: "static", vite: { build: { assetsInlineLimit: 0 } } },
    });
    const { render } = await fixture.startProdServer();

    const response = await render({
      component: "scriptTag",
      props: {},
      context: {},
      partial: false,
    });
    expect(response).toEqual({ redirectTo: "scriptTag/index.html" });

    const output = await Bun.file(
      path.join(
        fixture.fixtureRoot,
        "dist",
        "client",
        "scriptTag",
        "index.html",
      ),
    ).text();

    const matchingTags = getMatchingTags({
      html: output,
      tag: "script",
      fragment: false,
    });
    expect(matchingTags.length).toBe(1);

    const scriptSrc = matchingTags[0]?.properties.src as string;
    expect(scriptSrc).toMatch(/_astro\/.+\.js/);

    const scriptContent = await Bun.file(
      path.join(fixture.fixtureRoot, "dist", "client", scriptSrc),
    ).text();
    expect(scriptContent).toContain("Hello World!");
    expect(scriptContent).toContain("console.log");
  });

  it("can render an on-demand page with an inline script", async () => {
    await fixture.build({
      config: {
        output: "server",
        vite: { build: { assetsInlineLimit: 4096 } },
      },
    });
    const { render } = await fixture.startProdServer();

    const response = (await render({
      component: "scriptTag",
      props: {},
      context: {},
      partial: false,
    })) as { status: number; content: string };
    expect(response.status).toBe(200);

    expect(response.content).toContain('<script type="module">');
    expect(response.content).toContain("Hello World!");
    expect(response.content).toContain("console.log");
    expect(response.content).toContain("</script>");
  });

  it("can render an on-demand page with an external script", async () => {
    await fixture.build({
      config: { output: "server", vite: { build: { assetsInlineLimit: 0 } } },
    });
    const { render } = await fixture.startProdServer();

    const response = (await render({
      component: "scriptTag",
      props: {},
      context: {},
      partial: false,
    })) as { status: number; content: string };
    expect(response.status).toBe(200);

    const matchingTags = getMatchingTags({
      html: response.content,
      tag: "script",
      fragment: false,
    });
    expect(matchingTags.length).toBe(1);

    const scriptSrc = matchingTags[0]?.properties.src as string;
    expect(scriptSrc).toMatch(/_astro\/.+\.js/);

    const scriptContent = await Bun.file(
      path.join(fixture.fixtureRoot, "dist", "client", scriptSrc),
    ).text();
    expect(scriptContent).toContain("Hello World!");
    expect(scriptContent).toContain("console.log");
  });

  it("cannot start a prod server without building", async () => {
    expect(fixture.startProdServer()).rejects.toThrowError();
  });
});
