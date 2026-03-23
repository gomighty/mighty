import { getFixture } from "@tests/fixture";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("dev error fixture", () => {
  let fixture: ReturnType<typeof getFixture>;
  let stop: () => Promise<void>;

  beforeEach(() => {
    fixture = getFixture("dev.basic");
    stop = () => fixture.clean();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await stop();
  });

  it("renders the Astro error overlay", async () => {
    const devServer = await fixture.startDevServer({
      config: { logLevel: "silent" },
    });
    stop = devServer.stop;

    const response = await devServer.render({
      component: "error",
      partial: false,
    });
    expect(response.status).toBe(500);
    expect(response.content).toContain(
      '<script type="module" src="http://host-placeholder.test/@vite/client"></script>',
    );
  });

  it("throws an error when hmr.overlay is false", async () => {
    const devServer = await fixture.startDevServer({
      config: {
        logLevel: "silent",
        vite: { server: { hmr: { overlay: false } } },
      },
    });
    stop = devServer.stop;

    await expect(
      devServer.render({
        component: "error",
        partial: false,
      }),
    ).rejects.toThrow();
  });
});
