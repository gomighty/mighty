import { afterEach, beforeEach, describe, expect, it, jest } from "bun:test";
import { getFixture } from "@tests/fixture";

describe("dev error fixture", () => {
  const fixture = getFixture("dev.basic");

  beforeEach(() => {
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(async () => {
    jest.restoreAllMocks();
    await fixture.clean();
  });

  it("can render an error page", async () => {
    const { render } = await fixture.startDevServer({
      config: { logLevel: "silent" },
    });

    const response = await render({
      component: "error",
      props: {},
      context: {},
      partial: false,
    });
    expect(response.status).toBe(500);
    expect(response.content).toContain("<title>Error</title>");
    expect(response.content).toContain(
      '<script type="module" src="http://host-placeholder.test/@vite/client"></script>',
    );
    expect(response.content).toContain("pages/error.astro:2:1");
  });

  it("renders an error page when showErrorPage is true", async () => {
    const { render } = await fixture.startDevServer({
      showErrorPage: true,
      config: { logLevel: "silent" },
    });

    const response = await render({
      component: "error",
      props: {},
      context: {},
      partial: false,
    });
    expect(response.status).toBe(500);
    expect(response.content).toContain("<title>Error</title>");
    expect(response.content).toContain(
      '<script type="module" src="http://host-placeholder.test/@vite/client"></script>',
    );
    expect(response.content).toContain("pages/error.astro:2:1");
  });

  it("throws an error when showErrorPage is false", async () => {
    const { render } = await fixture.startDevServer({
      showErrorPage: false,
      config: { logLevel: "silent" },
    });

    expect(
      render({
        component: "error",
        props: {},
        context: {},
        partial: false,
      }),
    ).rejects.toThrow();
  });
});
