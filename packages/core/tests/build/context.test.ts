import { getFixture } from "@tests/fixture";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

describe("build context fixture", () => {
  let fixture: ReturnType<typeof getFixture>;

  beforeEach(() => {
    fixture = getFixture("build.context");
  });

  afterEach(async () => {
    await fixture.clean();
  });

  it("can build a server output with context", async () => {
    await expect(
      fixture.build({ config: { output: "server" } }),
    ).resolves.toBeUndefined();
  });

  it("cannot build a static output with context", async () => {
    await expect(
      fixture.build({ config: { output: "static" } }),
    ).rejects.toMatchObject({
      name: "MightyContextError",
      id: "src/pages/index.astro",
    });
  });
});
