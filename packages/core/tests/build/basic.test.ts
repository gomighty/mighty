import { readFile } from "node:fs/promises";
import path from "node:path";
import { getFixture } from "@tests/fixture";
import { afterEach, describe, expect, it } from "vitest";

describe("build basic fixture", () => {
  const fixture = getFixture("build.basic");

  afterEach(async () => {
    await fixture.clean();
  });

  it("can build a static output", async () => {
    await expect(
      fixture.build({ config: { output: "static" } }),
    ).resolves.toBeUndefined();

    const output = await readFile(
      path.join(fixture.fixtureRoot, "dist", "client", "index.html"),
      { encoding: "utf-8" },
    );

    expect(output).toBe("<!DOCTYPE html><p>Hello World!</p>");
  });

  it("can build a server output", async () => {
    await expect(
      fixture.build({ config: { output: "server" } }),
    ).resolves.toBeUndefined();

    const output = await readFile(
      path.join(
        fixture.fixtureRoot,
        "dist",
        "server",
        "pages",
        "index.astro.mjs",
      ),
      { encoding: "utf-8" },
    );

    expect(output).toContain("<p>Hello World!</p>");
  });
});
