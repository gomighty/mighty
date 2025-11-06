import { rm } from "node:fs/promises";
import path from "node:path";
import { isolatedDeclaration } from "oxc-transform";
import { replaceTscAliasPaths } from "tsc-alias";

const ENTRYPOINTS = ["src/index.ts", "src/server.ts"];

await rm("dist", { recursive: true, force: true });

async function getDependencies() {
  const { default: lockFile } = await import("../../bun.lock");
  return Object.keys(lockFile.packages).filter(
    (pkg) => !pkg.startsWith("@gomighty/") || pkg === "@gomighty/core",
  );
}

await Bun.build({
  entrypoints: ENTRYPOINTS,
  target: "node",
  outdir: "dist",
  root: "src",
  external: await getDependencies(),
  splitting: true,
  minify: { identifiers: true },
});

await Promise.all(
  ENTRYPOINTS.map(async (entrypoint) => {
    const declarationCode = isolatedDeclaration(
      entrypoint,
      await Bun.file(entrypoint).text(),
    ).code;

    const destination = entrypoint.startsWith("src")
      ? path.join("dist", entrypoint.slice("src".length))
      : path.join("dist", entrypoint);

    return Bun.write(destination.replace(".ts", ".d.ts"), declarationCode);
  }),
);

await replaceTscAliasPaths();
