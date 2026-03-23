import { mkdir, readFile, symlink } from "node:fs/promises";
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

  it("shows help with --help flag", async () => {
    await expect(runCli(["--help"])).rejects.toThrow("Usage: mighty-hono");
  });

  it("shows help with -h flag", async () => {
    await expect(runCli(["-h"])).rejects.toThrow("Usage: mighty-hono");
  });

  it("rejects a missing --root value", async () => {
    await expect(runCli(["build", "--root"])).rejects.toThrow(
      "Option '--root <value>' argument missing",
    );
  });

  it("builds the fixture when --root is provided before the command", async () => {
    // Use the unique outDir as a build root (with symlinks to fixture source)
    // to avoid parallel build conflicts on the shared dist/ directory.
    const buildRoot = fixture.outDir;
    await mkdir(buildRoot, { recursive: true });
    await symlink(
      path.join(fixture.fixtureRoot, "astro.config.ts"),
      path.join(buildRoot, "astro.config.ts"),
    );
    await symlink(
      path.join(fixture.fixtureRoot, "src"),
      path.join(buildRoot, "src"),
    );

    await expect(runCli(["--root", buildRoot, "build"])).resolves.toBe(
      undefined,
    );

    const output = await readFile(
      path.join(buildRoot, "dist", "client", "index.html"),
      "utf-8",
    );

    expect(output).toBe("<!DOCTYPE html><p>Hello World!</p>");
  });
});
