import { getFixture } from "@tests/fixture";
import { afterEach, describe, expect, it } from "vitest";

describe("build context fixture", () => {
  const fixture = getFixture("build.context");

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
    ).rejects.toThrowError(
      expect.toSatisfy((error) => {
        expect(error.name).toBe("MightyContextError");
        expect(error.id).toBe("src/pages/index.astro");
        return true;
      }),
    );
  });
});
