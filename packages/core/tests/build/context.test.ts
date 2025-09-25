import { afterEach, describe, expect, it } from "bun:test";
import { getFixture } from "@tests/fixture";

describe("build context fixture", () => {
  const fixture = getFixture("build.context");

  afterEach(async () => {
    await fixture.clean();
  });

  it("can build a server output with context", async () => {
    expect(
      fixture.build({ config: { output: "server" } }),
    ).resolves.toBeUndefined();
  });

  it("cannot build a static output with context", async () => {
    expect(fixture.build({ config: { output: "static" } })).toEqual(
      expect.rejectsTo.objectContaining({
        name: "MightyContextError",
        id: "src/pages/index.astro",
      }),
    );
  });
});
