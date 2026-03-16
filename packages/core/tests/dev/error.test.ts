import { getFixture } from "@tests/fixture";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("dev error fixture", () => {
  let fixture: ReturnType<typeof getFixture>;

  beforeEach(() => {
    fixture = getFixture("dev.basic");
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await fixture.clean();
  });

  it("renders the Astro error overlay", async () => {
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
    expect(response.content).toContain(
      '<script type="module" src="http://host-placeholder.test/@vite/client"></script>',
    );
  });

  it("throws an error when hmr.overlay is false", async () => {
    const { render } = await fixture.startDevServer({
      config: {
        logLevel: "silent",
        vite: { server: { hmr: { overlay: false } } },
      },
    });

    await expect(
      render({
        component: "error",
        props: {},
        context: {},
        partial: false,
      }),
    ).rejects.toThrow();
  });
});
