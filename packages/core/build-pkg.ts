import { copyFile, mkdir, rm } from "node:fs/promises";
import path from "node:path";
import { $ } from "bun";
import { replaceTscAliasPaths } from "tsc-alias";

const FILES_TO_COPY_AS_IS = ["src/dev/render.ts"];

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
  entrypoints: ["src/index.ts", "src/dev/index.ts", "src/context/index.ts"],
  target: "node",
  outdir: "dist",
  root: "src",
  external: await getDependencies(),
  // @ts-expect-error splitting is a supported option
  splitting: true,
  minify: { identifiers: true },
});

await Promise.all(FILES_TO_COPY_AS_IS.map(copyFileWithMkdir));

await $`bunx tsgo`;
await replaceTscAliasPaths();
