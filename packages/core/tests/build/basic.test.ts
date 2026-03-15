import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { getFixture } from "@tests/fixture";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

describe("build basic fixture", () => {
  let fixture: ReturnType<typeof getFixture>;

  beforeEach(() => {
    fixture = getFixture("build.basic");
  });

  afterEach(async () => {
    await fixture.clean();
  });

  it("can build a static output", async () => {
    await expect(
      fixture.build({ config: { output: "static" } }),
    ).resolves.toBeUndefined();

    const output = await readFile(
      path.join(fixture.outDir, "client", "index.html"),
      { encoding: "utf-8" },
    );

    expect(output).toBe("<!DOCTYPE html><p>Hello World!</p>");
  });

  it("can build a server output", async () => {
    await expect(
      fixture.build({ config: { output: "server" } }),
    ).resolves.toBeUndefined();

    const serverDir = path.join(fixture.outDir, "server");
    const entryExists = await readFile(path.join(serverDir, "entry.mjs"), {
      encoding: "utf-8",
    });
    expect(entryExists).toBeDefined();

    const chunks = await readdir(path.join(serverDir, "chunks"));
    const output = await Promise.all(
      chunks
        .filter((f) => f.startsWith("index_") && f.endsWith(".mjs"))
        .map((f) =>
          readFile(path.join(serverDir, "chunks", f), { encoding: "utf-8" }),
        ),
    );
    expect(output.some((c) => c.includes("<p>Hello World!</p>"))).toBe(true);
  });
});
