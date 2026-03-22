import { readFile } from "node:fs/promises";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { runCli } from "../src/cli/run";
import { getFixture } from "./fixture";

describe("cli", () => {
  let fixture: ReturnType<typeof getFixture>;

  beforeEach(() => {
    fixture = getFixture("basic");
  });

  afterEach(async () => {
    await fixture.clean();
  });

  it("rejects a missing --root value", async () => {
    await expect(runCli(["build", "--root"])).rejects.toThrow(
      "Option '--root <value>' argument missing",
    );
  });

  it("builds the fixture when --root is provided before the command", async () => {
    await expect(
      runCli(["--root", fixture.fixtureRoot, "build"]),
    ).resolves.toBe(undefined);

    const output = await readFile(
      path.join(fixture.fixtureRoot, "dist", "client", "index.html"),
      "utf-8",
    );

    expect(output).toBe("<!DOCTYPE html><p>Hello World!</p>");
  });
});
