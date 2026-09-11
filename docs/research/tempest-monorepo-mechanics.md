# Tempest-style monorepo mechanics for PHP and JS packages

Research date: 2026-09-11. Scope: [Tempest-style monorepo mechanics for PHP and JS packages](https://github.com/gomighty/mighty/issues/34), part of [Map: the way to Mighty 0.1.0](https://github.com/gomighty/mighty/issues/29). This report records observed behavior and a concrete adaptation proposal. It does not settle the final architecture decision in [Monorepo layout and release pipeline](https://github.com/gomighty/mighty/issues/42) or implement the proposal.

The inspected Tempest framework default branch was `3.x` at commit `006169824ba6ae00edd0d87662f01bc6baddc401`. The scaffold repository was inspected at `6619b5c29ef06d177924b60cb6db6da5f494f751`. Source links below pin those commits. Tempest requests `symplify/monorepo-builder:^11.2`; version 11.2.0 source was inspected at `da378e742aaa8e8848cc600801f4b6a259441b70`. The Tempest checkout has no committed root Composer lockfile, so 11.2.0 is a documented compatible baseline, not proof of the exact version used by every Tempest install. [Tempest dependency declaration](https://github.com/tempestphp/tempest-framework/blob/006169824ba6ae00edd0d87662f01bc6baddc401/composer.json#L51-L95), [framework tree](https://github.com/tempestphp/tempest-framework/tree/006169824ba6ae00edd0d87662f01bc6baddc401).

## Observed PHP development model

Tempest publishes an aggregate `tempest/framework` package. Its root `composer.json` lists external runtime and development dependencies, replaces 33 component packages using `self.version`, and maps each component namespace to a specific `packages/<component>/src` directory. It also lists function files and package test namespaces explicitly. `packages/*/src` describes the layout; it is not a literal wildcard PSR-4 entry. The root additionally owns `Tempest\Framework\` in `src/Tempest/Framework`. [Root identity and dependencies](https://github.com/tempestphp/tempest-framework/blob/006169824ba6ae00edd0d87662f01bc6baddc401/composer.json#L1-L95), [replacement and runtime autoload](https://github.com/tempestphp/tempest-framework/blob/006169824ba6ae00edd0d87662f01bc6baddc401/composer.json#L97-L213), [test autoload](https://github.com/tempestphp/tempest-framework/blob/006169824ba6ae00edd0d87662f01bc6baddc401/composer.json#L214-L251).

Each component remains independently installable after splitting: for example `packages/core/composer.json` declares `tempest/core`, component dependencies at `3.x-dev`, `Tempest\Core\ → src`, its function file, and its own test namespace. The paths are relative to the component root, whereas the merged root paths include `packages/core/`. [Core manifest](https://github.com/tempestphp/tempest-framework/blob/006169824ba6ae00edd0d87662f01bc6baddc401/packages/core/composer.json#L1-L33).

Composer's `replace` satisfies dependencies on a package whose code the replacing package provides; `self.version` limits replacement to the aggregate's version. It does not discover package manifests or import their autoload rules. PSR-4 maps namespace prefixes to explicit paths relative to the manifest. Development autoload belongs to the active root package. Therefore a Mighty root replacement must supply the library source and its dependency requirements itself, and must have a version compatible with any internal constraints. [Composer schema](https://getcomposer.org/doc/04-schema.md#replace), [autoload](https://getcomposer.org/doc/04-schema.md#psr-4), [autoload-dev](https://getcomposer.org/doc/04-schema.md#autoload-dev).

## How manifests stay synchronized

`monorepo-builder.php` configures `src/Tempest` and `packages` as discovery roots. `composer merge` invokes the builder's merge command, and local `composer qa` includes merge and package validation. There is no implicit Composer-install hook that synchronizes every child manifest. [Configuration](https://github.com/tempestphp/tempest-framework/blob/006169824ba6ae00edd0d87662f01bc6baddc401/monorepo-builder.php#L5-L12), [scripts](https://github.com/tempestphp/tempest-framework/blob/006169824ba6ae00edd0d87662f01bc6baddc401/composer.json#L269-L309).

The relevant 11.2.0 documentation describes merge as flowing from package manifests into the root: requirements, development requirements, autoload, development autoload, repositories, and extra metadata. `validate` checks shared dependency-version consistency; `bump-interdependency` rewrites dependencies among internal packages to a requested constraint. These are separate commands, not a universal bidirectional synchronization mechanism. [Builder 11.2.0 commands](https://github.com/symplify/monorepo-builder/blob/da378e742aaa8e8848cc600801f4b6a259441b70/README.md#L28-L109).

The release script calls `bump-interdependency` with the release version and validates. After tagging it rewrites internal constraints back to `<current-branch>-dev` and validates again. It explicitly restores the external `tempest/highlight` dependency to the root constraint after each bump. JS versions are handled by a separate function scanning workspace directories for `package.json`. [PHP version handling](https://github.com/tempestphp/tempest-framework/blob/006169824ba6ae00edd0d87662f01bc6baddc401/bin/release#L45-L103), [JS version handling](https://github.com/tempestphp/tempest-framework/blob/006169824ba6ae00edd0d87662f01bc6baddc401/bin/release#L105-L133).

Tempest's package-validation workflow runs root and per-package `composer validate`, followed by its own file/license checker. That checker requires `.gitattributes`, `composer.json`, `phpunit.xml`, and an exact MIT license copy. The workflow itself does not run `composer merge` and fail on generated drift. Mighty should add that explicit drift check if it chooses generated root metadata. [Validation workflow](https://github.com/tempestphp/tempest-framework/blob/006169824ba6ae00edd0d87662f01bc6baddc401/.github/workflows/validate-packages.yml#L29-L43), [file checks](https://github.com/tempestphp/tempest-framework/blob/006169824ba6ae00edd0d87662f01bc6baddc401/bin/validate-packages#L22-L59).

Version caution: the repository's current builder README now recommends `monorepo-php/monorepo` and describes newer features. Do not attribute those features to Tempest's `^11.2` dependency. The current README says the new package requires PHP 8.2+ and the older package is no longer maintained. [Current builder README at an inspected commit](https://github.com/symplify/monorepo-builder/blob/35e7593ea00d317008d40596e505e83bf8eddccf/README.md#L5-L14).

Tempest's current root and PHP CI require/use PHP 8.5, so its dependency list and CI matrix cannot be copied into a Mighty PHP 8.2 baseline. Builder 11.2.0 itself declares PHP `>=8.1`; its historical minimum is not the reason Tempest requires 8.5. A new Mighty adoption should select and lock the maintained builder separately, then verify its complete dependency resolution against the chosen minimum PHP version. [Tempest PHP requirement](https://github.com/tempestphp/tempest-framework/blob/006169824ba6ae00edd0d87662f01bc6baddc401/composer.json#L25-L29), [Tempest CI runtime](https://github.com/tempestphp/tempest-framework/blob/006169824ba6ae00edd0d87662f01bc6baddc401/.github/workflows/validate-packages.yml#L22-L27), [builder 11.2.0 requirements](https://github.com/symplify/monorepo-builder/blob/da378e742aaa8e8848cc600801f4b6a259441b70/composer.json#L8-L19).

## Exact splitting behavior and pitfalls

`bin/get-packages` scans only immediate children of `packages/` and keeps those with `composer.json`. It removes `tempest/` from each Composer name and emits basename, absolute directory, short name, Composer package, organization, and target repository. The JS-only Vite plugin is therefore absent from the PHP split matrix. [Scanner](https://github.com/tempestphp/tempest-framework/blob/006169824ba6ae00edd0d87662f01bc6baddc401/bin/get-packages#L14-L69).

The workflow triggers on the listed numeric release-branch patterns, `v*` tags, and manual dispatch. It builds a matrix from the scanner, installs `git-filter-repo` with pip, and passes only `matrix.package.name` to `bin/split`, with `secrets.ACCESS_TOKEN` exposed as `GH_TOKEN`. [Split workflow](https://github.com/tempestphp/tempest-framework/blob/006169824ba6ae00edd0d87662f01bc6baddc401/.github/workflows/subsplit-packages.yml#L1-L52).

The script creates a public target repo when `gh repo view` fails, with a read-only description and disabled issues/wiki. It clones the upstream framework anew, records that clone's current/default branch, runs `git filter-repo --subdirectory-filter packages/<name>`, adds the authenticated target remote, then force-pushes all local branches and tags. The source subtree becomes the destination root and its retained history is rewritten. “Read only” is a publishing convention in this script; it does not configure a repository permissions policy. [Split script](https://github.com/tempestphp/tempest-framework/blob/006169824ba6ae00edd0d87662f01bc6baddc401/bin/split#L3-L39).

Implications inferred directly from that script:

- It ignores the scanner's `basename` and `directory`. Copying it for `gomighty/laravel` would look for `packages/laravel`, the planned JS package, instead of `packages/laravel-php`.
- It does not pin its fresh clone to the workflow event SHA or explicitly select the triggering branch/tag. A workflow checkout at a tag does not change the clone created inside the script.
- `--all` pushes local branch refs present after filtering; the script does not explicitly define the supported branch set. Its comment is not a sufficient guarantee about every upstream branch.
- It force-pushes every retained tag, which fits Tempest's shared `v*` release stream but requires explicit tag mapping if Mighty adopts independent package versions.
- It lacks `set -euo pipefail`, argument validation, an explicit path/target allowlist, and per-target concurrency. These should be added to the adaptation; do not copy the remote-creation fallback or broad force-push behavior blindly.

All five observations refer to the [same complete split script](https://github.com/tempestphp/tempest-framework/blob/006169824ba6ae00edd0d87662f01bc6baddc401/bin/split#L1-L39).

## JavaScript coexistence

Tempest uses Bun. Root `package.json` is private, declares `workspaces: ["packages/*"]`, links `vite-plugin-tempest` with `workspace:*`, and runs workspace build/stub scripts with Bun. `packages/vite-plugin-tempest` has a normal npm manifest, dist exports, build/test scripts, and Vite peer dependencies. Its directory is separate from the PHP `packages/vite` package. [Root JS manifest](https://github.com/tempestphp/tempest-framework/blob/006169824ba6ae00edd0d87662f01bc6baddc401/package.json#L1-L23), [plugin manifest](https://github.com/tempestphp/tempest-framework/blob/006169824ba6ae00edd0d87662f01bc6baddc401/packages/vite-plugin-tempest/package.json#L1-L36).

On `v*` tags the JS workflow installs with Bun, tests, builds, then attempts publication for every immediate `packages/*` directory containing `package.json`. Its shell loop has no explicit private-package or application-template exclusion. Mighty should use an explicit publishable-package list. [JS publishing workflow](https://github.com/tempestphp/tempest-framework/blob/006169824ba6ae00edd0d87662f01bc6baddc401/.github/workflows/publish-javascript-packages.yml#L1-L43).

For Mighty, pnpm 10 workspaces are defined in `pnpm-workspace.yaml`; negative globs can exclude selected paths. The root is always included. A normal published `workspace:` dependency is rewritten to a registry-compatible constraint on pack/publish, but a copied app template is not an npm pack operation. Do not ship `workspace:*`, `catalog:`, or local filesystem links in a starter intended to install outside this checkout. [pnpm 10 workspace patterns](https://pnpm.io/10.x/pnpm-workspace_yaml), [workspace dependency publishing](https://pnpm.io/workspaces#publishing-workspace-packages).

## The app is a separate scaffold, not an observed monorepo mirror

`tempestphp/tempest-app` describes itself as the default scaffold. Its root Composer manifest is `tempest/app`, type `project`, requiring `tempest/framework:^3.0`, with `App\ → app/`, project installation commands, and its own QA scripts. [Scaffold README](https://github.com/tempestphp/tempest-app/blob/6619b5c29ef06d177924b60cb6db6da5f494f751/README.md#L7-L14), [scaffold manifest](https://github.com/tempestphp/tempest-app/blob/6619b5c29ef06d177924b60cb6db6da5f494f751/composer.json#L1-L44).

The framework workflow dispatches QA in the app repository; it does not copy source or split an app subtree. The app workflow checks out its own source, runs Composer update, installs framework files, starts the server, and attempts an HTTP request. No app mirror is present in the framework's split scanner/workflow or the examined app workflows. This is a bounded negative finding about the inspected source; it does not establish the absence of private/external automation. [Framework QA dispatch](https://github.com/tempestphp/tempest-framework/blob/006169824ba6ae00edd0d87662f01bc6baddc401/.github/workflows/trigger-tempest-app-qa.yml#L1-L27), [app QA](https://github.com/tempestphp/tempest-app/blob/6619b5c29ef06d177924b60cb6db6da5f494f751/.github/workflows/tempest-app-quality-control.yml#L19-L45), [split discovery](https://github.com/tempestphp/tempest-framework/blob/006169824ba6ae00edd0d87662f01bc6baddc401/bin/get-packages#L37-L69).

## Concrete Mighty adaptation proposal

These are proposed implementation choices, not Tempest facts or a resolved [Monorepo layout and release pipeline](https://github.com/gomighty/mighty/issues/42) decision.

| Directory | Identity | Development and distribution |
| --- | --- | --- |
| `packages/laravel-php` | Composer `gomighty/laravel` | PHP library, own `composer.json`, `src/`, `tests/`; explicit split destination such as `gomighty/laravel` |
| `packages/laravel` | npm `@gomighty/laravel` | Normal pnpm member, built and published as JS |
| `packages/laravel-starter-kit` | Standalone Laravel app template | Own project Composer and private npm manifests; excluded from root package discovery; mirrored to `gomighty/laravel-starter-kit` |
| `packages/create-mighty` | npm `create-mighty` | Normal pnpm member and published executable; scaffold source/ref policy must be specified separately |

Keep root pnpm `packages/*` and add explicit exclusions for `packages/laravel-php` and `packages/laravel-starter-kit`. A pure PHP directory without a package manifest does not need a fake npm manifest merely to live under `packages/`. The starter's real `package.json` makes explicit exclusion useful. Also narrow independent build-tool globs; pnpm exclusions do not automatically configure tsdown or other tools.

For a Tempest-style PHP root, add `composer.json` with a distinct development-root name, `replace: {"gomighty/laravel": "self.version"}`, `Mighty\Laravel\ → packages/laravel-php/src/`, and library test autoload in `autoload-dev`. Treat the component manifest as authoritative; generate merged root fields and fail CI if a second merge changes tracked files. Use `monorepo-builder.php` with only `packages/laravel-php` as its discovery root, or a broader root with explicit starter exclusion and a checked expected package list. The 11.2.0 finder is recursive, so merely having a top-level package glob elsewhere does not protect a nested app manifest. [Builder finder](https://github.com/symplify/monorepo-builder/blob/da378e742aaa8e8848cc600801f4b6a259441b70/src/Finder/PackageComposerFinder.php#L63-L85).

Never merge the starter's `App\` or `Tests\` autoload, app scripts, dependencies, or package identity into the root aggregate. Run the starter as a separate Composer root. For local integration CI, make a disposable starter copy and configure a Composer path repository for the local PHP library; choose a compatible version using an explicit path-repository version override if necessary. Composer supports symlinking or mirroring path packages. Keep this override out of the distributed template. [Composer path repositories](https://getcomposer.org/doc/05-repositories.md#path).

The map already selects a Tempest-style root Composer setup. With one PHP library, keep its merge configuration narrow and verify the root version used by `self.version` against internal constraints. [Monorepo layout and release pipeline](https://github.com/gomighty/mighty/issues/42) should lock the maintained builder version and configuration, root version handling, and the exact CI jobs within that standing choice.

Proposed file/workflow checklist:

1. Add the four package directories/manifests, PHP source/test configuration and library license/readme; keep the starter application manifest and scripts self-contained.
2. Update `pnpm-workspace.yaml`, root build configuration, and relevant ignore rules for PHP vendors, app runtime output, and separate installation artifacts.
3. For the Tempest-style choice, add root `composer.json`, development lockfile policy, `monorepo-builder.php`, and PHP merge/validate/test scripts. Configure PHP discovery explicitly and test the merged root's namespace map.
4. Add `bin/get-packages` backed by an explicit distribution map, for example `packages/laravel-php → gomighty/laravel` and `packages/laravel-starter-kit → gomighty/laravel-starter-kit`. Keep `sourcePath`, Composer name, target repo, branch, and tag policy as separate fields. The app may be a split target without being a root Composer component.
5. Add `bin/split` using a disposable clone, exact verified source SHA/ref, validated path/target, fail-fast shell behavior, explicit destination ref, and controlled tag mapping. Pre-create target repos with the intended permissions; do not treat every failed repository lookup as permission to create one.
6. Add `.github/workflows/php-ci.yml` for PHP manifest validation, selected development model, merge drift checks if relevant, library tests, and an isolated package install. Retain the existing JS build/typecheck/lint/test suite.
7. Add `.github/workflows/starter-kit-ci.yml` to copy the starter out of the monorepo, install PHP and JS dependencies, build assets, and smoke-test booting. Exercise both released dependencies and local integration overrides. Verify published output contains no workspace-only references.
8. Add `.github/workflows/subsplit-packages.yml` with explicit mapping, full required history, event-SHA selection, destination-specific concurrency, and a narrowly scoped cross-repository credential. Mirror `main` only after checks succeed; define tag behavior separately in [Monorepo layout and release pipeline](https://github.com/gomighty/mighty/issues/42).
9. Add or extend npm release automation for the explicit publishable JS package list. Do not use “every package.json under packages” as the publication policy.
10. Put the read-only contribution notice in the starter source so it survives splitting; direct changes to `gomighty/mighty`. Record source SHA and verify the split tree matches the chosen source subtree before pushing.

Upstream verification: read repositories and workflow source, pinned relevant source commits, and checked compatible builder documentation/source and official Composer/pnpm docs. No upstream workflows, releases, installs, or split pushes were executed.

## Mighty workspace checks

The local source snapshot is [Mighty `6c7ca1d`](https://github.com/gomighty/mighty/tree/6c7ca1d7ffab6494602db5d72720e764b8b00465). These observations describe the current checkout, before any proposed PHP package is added.

- [pnpm-workspace.yaml](https://github.com/gomighty/mighty/blob/6c7ca1d7ffab6494602db5d72720e764b8b00465/pnpm-workspace.yaml) selects `packages/*`; the root manifest pins pnpm 10.30.1.
- [tsdown.config.ts](https://github.com/gomighty/mighty/blob/6c7ca1d7ffab6494602db5d72720e764b8b00465/tsdown.config.ts) independently selects `packages/*`. A pnpm exclusion does not change this configuration. Use an explicit list of buildable npm packages when adding the new directories. The installed tsdown 0.21.0 source resolves the configured directory glob and loads each directory's configuration; it does not read pnpm's package exclusions for this explicit glob.
- [CI](https://github.com/gomighty/mighty/blob/6c7ca1d7ffab6494602db5d72720e764b8b00465/.github/workflows/ci.yml) already contains a Vitest job and builds before tests and typechecking. The map's instruction to add a Vitest job should become an instruction to retain and extend it.

### pnpm discovery probe

Executed with Node 24.21.0 and pnpm 10.30.1 in a temporary directory outside the repository. The root manifest was private and pinned the same package-manager version. Three child directories were created: `laravel-php` containing only `composer.json`, `laravel` containing only `package.json`, and `laravel-starter-kit` containing both. Both JavaScript manifests were private and named.

| Workspace patterns | Result of `pnpm -r list --depth -1 --json` |
| --- | --- |
| `packages/*` | Root, `laravel`, and `laravel-starter-kit`; no `laravel-php` |
| `packages/*`, `!packages/laravel-php`, `!packages/laravel-starter-kit` | Root and `laravel` only |

Both commands exited successfully. Thus a PHP directory alone is harmless to pnpm discovery; the concrete conflict is the starter's JavaScript manifest joining the monorepo workspace. An explicit PHP exclusion documents the boundary and protects it if that directory gains JavaScript tooling later. Exclusion syntax is supported by the [pnpm 10 workspace documentation](https://pnpm.io/10.x/pnpm-workspace_yaml).

Excluding the starter from package discovery does not make every command run inside it independent of the parent workspace. The installed pnpm 10.30.1 `install --help` explicitly provides `--ignore-workspace` for a standalone installation. Use that flag when testing the starter in place, or, preferably, copy/export the starter into a temporary directory outside the monorepo and exercise its normal documented install flow. Published starter manifests must contain usable registry dependencies, rather than `workspace:` or monorepo-relative paths. The precise scaffolding flow remains a decision for [create-mighty flow](https://github.com/gomighty/mighty/issues/45).

## Verification and limits

All 34 unique immutable source-file links were checked against the corresponding Git objects; each cited file exists and every line anchor is within the file.

This report is research, with a proposed layout for the later decision ticket. No PHP adapter, release workflow, or mirror was implemented or published; no end-to-end Composer install or subsplit push was tested.

- `pnpm build`: passed on the existing lockfile.
- `pnpm run typecheck`: passed; Astro reported zero errors, warnings, or hints.
- `pnpm run ci:biome`: the main checkout failed because Biome discovered nested root configurations in `.context` research worktrees. The same command passed in the isolated research worktree at the same source commit (107 files).
- `pnpm test`: 49 passed, one failed with `ENOTEMPTY` while deleting `packages/core/fixtures/dev/basic/node_modules`. The error fixture and basic fixture share that directory, and cleanup removes it. The original default-parallel failure must not be treated as a clean pass.
- `pnpm test --no-file-parallelism`: 49 passed, one failed on the React dev suite's `afterEach` timeout. The serial run did not reproduce the deletion failure, but it also did not produce a clean suite. These existing-suite failures remain unresolved.

The test cleanup code is in [getFixture](https://github.com/gomighty/mighty/blob/6c7ca1d7ffab6494602db5d72720e764b8b00465/packages/core/tests/fixture.ts), and the error suite explicitly uses `dev.basic` in [error.test.ts](https://github.com/gomighty/mighty/blob/6c7ca1d7ffab6494602db5d72720e764b8b00465/packages/core/tests/dev/error.test.ts). A fixture-cleanup race is the likely cause; no unrelated test implementation was changed for this research ticket.
