import { styleText } from "node:util";
import { $ } from "bun";

const packagesToBuildConcurrently = [["@gomighty/core"], ["@gomighty/hono"]];

for (const packages of packagesToBuildConcurrently) {
  await Promise.allSettled(
    packages.map(async (pkg) => {
      const styledPkgName = styleText("bold", pkg);
      console.log(`Building package ${styledPkgName}...`);
      const startTime = performance.now();
      const { stderr, exitCode } = await $`bun run --filter '${pkg}' build-pkg`
        .nothrow()
        .quiet();
      const endTime = performance.now();
      if (exitCode === 0) {
        console.log(
          `Package ${styledPkgName} built in ${Math.round(endTime - startTime)}ms.`,
        );
      } else {
        console.error(stderr.toString());
        console.error(`Failed to build package ${styledPkgName}.`);
      }
    }),
  );
}
