import { copyFile, mkdir, rm } from "node:fs/promises";
import path from "node:path";
import { isolatedDeclaration } from "oxc-transform";
import { replaceTscAliasPaths } from "tsc-alias";

const FILES_TO_COPY_AS_IS = ["src/dev/render-vite.ts"];

const ENTRYPOINTS = [
  "src/index.ts",
  "src/dev/index.ts",
  "src/context/index.ts",
  "src/start/index.ts",
  "src/build/index.ts",
  "src/types.ts",
  "src/schemas.ts",
];

await rm("dist", { recursive: true, force: true });

async function getDependencies() {
  const { default: lockFile } = await import("../../bun.lock");
  return Object.keys(lockFile.packages).filter(
    (pkg) => !pkg.startsWith("@gomighty/"),
  );
}

async function copyFileWithMkdir(source: string) {
  const destination = source.startsWith("src")
    ? path.join("dist", source.slice("src".length))
    : path.join("dist", source);
  await mkdir(path.dirname(destination), { recursive: true });
  await copyFile(source, destination);
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

await Promise.all(FILES_TO_COPY_AS_IS.map(copyFileWithMkdir));

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
