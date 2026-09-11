# Astro 7 upgrade impact on Mighty

Research for [Astro 7 upgrade impact on the internals core relies on](https://github.com/gomighty/mighty/issues/31), checked 2026-09-11 against Mighty commit `6c7ca1d7ffab6494602db5d72720e764b8b00465`. This is source inspection, not a completed upgrade or an Astro 7 test run.

The target is available. npm's `latest` resolved to **Astro 7.3.2**; its published package declares Node `>=22.12.0`, Vite `^8.0.13`, and `@astrojs/compiler-rs ^0.4.0`. I inspected the exact Astro 7.3.2 and Vite 8.0.13 tarballs and Astro's corresponding Git tag. The higher Node requirement imposed by repository build tools is a separate constraint. [Astro package metadata](https://registry.npmjs.org/astro/7.3.2)

## Findings at a glance

All audited Astro imports and manifest fields still exist in 7.3.2. The migration has concrete work in the integration logger stub, compiler-output expectations, Vitest matcher types, Starlight sidebar configuration, and Biome diagnostics. Development-server lifecycle, CSS traversal, HMR and emitted page chunks require runtime verification because Mighty depends on implementation details that the public migration guide cannot guarantee.

The Astro runtime floor remains Node 22.12+ in this research. Building the repository with tsdown 0.23 requires Node 22.18+, 24.11+, or 26+. This distinction must appear in CI and installation documentation.

## Per-import and internal-use verdicts

| Mighty dependency | Astro 7.3.2 verdict | Required action or verification |
| --- | --- | --- |
| `experimental_AstroContainer` from `astro/container` (`dev/render-vite.ts`, `start/index.ts`) | **Exists at the same export.** `create()` accepts `renderers`, `resolve`, `manifest`; `renderToString()` accepts `props` and `partial`. Internally it now renders through fetch state and a container environment. | Keep imports/call signatures. Exercise dev and built output; API presence alone does not establish behavior compatibility. [Container source](https://github.com/withastro/astro/blob/astro%407.3.2/packages/astro/src/container/index.ts) |
| `AstroComponentFactory` from `astro/runtime/server/index.js` | **Exists at the same exported type path.** Package exports still permit `./runtime/*`. | No source import change identified. It remains a runtime-internal type dependency. [Server exports](https://github.com/withastro/astro/blob/astro%407.3.2/packages/astro/src/runtime/server/index.ts), [package exports](https://github.com/withastro/astro/blob/astro%407.3.2/packages/astro/package.json) |
| `createApp` from `astro/app/entrypoint` (`build/server-entrypoint.mjs`) | **Exists.** The public entrypoint delegates to `virtual:astro:app`; the production implementation creates an `App` with the built manifest. | Keep the import inside Astro's bundled adapter entrypoint. Verify generated `entry.mjs` still exports `manifest` and dynamic page chunks resolve. Do not test this virtual entrypoint using an unbundled Node import. [Entrypoint](https://github.com/withastro/astro/blob/astro%407.3.2/packages/astro/src/core/app/entrypoints/virtual/index.ts), [production implementation](https://github.com/withastro/astro/blob/astro%407.3.2/packages/astro/src/core/app/entrypoints/virtual/prod.ts) |
| `mergeConfig` from `astro/config` | **Exists**, including generic `mergeConfig<C>(defaults, overrides): C`. | No import/signature change. Review user config for changed option values independently. [Config exports](https://github.com/withastro/astro/blob/astro%407.3.2/packages/astro/src/config/entrypoint.ts), [merge implementation](https://github.com/withastro/astro/blob/astro%407.3.2/packages/astro/src/core/config/merge.ts) |
| `validateConfig` from `astro/config` (`utils/astroDefaults.ts`) | **Exists**, with `(userConfig, root, cmd): Promise<AstroConfig>`. | The present call remains valid; its returned defaults change with Astro. [Validation implementation](https://github.com/withastro/astro/blob/astro%407.3.2/packages/astro/src/core/config/validate.ts) |
| `manifest.entryModules` | **Exists**, still `Record<string, string>`. Built values originate from entry specifier-to-bundle mappings. | Verify actual emitted mappings under Rolldown; the existence of the field is insufficient proof that every expected page gets a standalone chunk. [Manifest types](https://github.com/withastro/astro/blob/astro%407.3.2/packages/astro/src/core/app/types.ts), [mapping writer](https://github.com/withastro/astro/blob/astro%407.3.2/packages/astro/src/core/build/plugins/plugin-internals.ts) |
| `\0virtual:astro:page:src/pages/...@_@astro` keys and `module.page().default` | **The virtual ID convention and `page()` wrapper still exist.** Null-byte prefix and `@_@` extension encoding remain. | No evidence supports a mandatory rename. Add a build-output contract check for ordinary/nested SSR pages rather than guessing a replacement key. [Constants](https://github.com/withastro/astro/blob/astro%407.3.2/packages/astro/src/vite-plugin-pages/const.ts), [encoding](https://github.com/withastro/astro/blob/astro%407.3.2/packages/astro/src/vite-plugin-pages/util.ts), [page wrapper](https://github.com/withastro/astro/blob/astro%407.3.2/packages/astro/src/vite-plugin-pages/page.ts) |
| `manifest.routes[].styles` | **Exists**, with inline/external stylesheet assets. SSR manifest generation strips styles from prerendered routes and removes entry modules used only by the prerender environment. | Current prerender redirect happens before styles/page-module lookup, which matches this split. Verify SSR inline and external CSS, base paths, and prerender redirects. [Manifest generation](https://github.com/withastro/astro/blob/astro%407.3.2/packages/astro/src/core/build/plugins/plugin-manifest.ts) |
| Mocked `astro:config:setup` arguments (`utils/integrations.ts`) | **Hook shape still matches** the listed config, renderer, script, codegen, middleware and watcher callbacks. | No new mandatory callback found. The logger mock does break; see below. Replaying hooks against defaults and swallowing errors remains unreliable for integrations with state or real-config dependencies. [Integration hook types](https://github.com/withastro/astro/blob/astro%407.3.2/packages/astro/src/types/public/integrations.ts) |

## Confirmed logger change

`getAstroSampleIntegrationLogger()` must change if retained: `options.dest` is now **`options.destination`**, and `AstroIntegrationLogger` has required **`flush()` and `close()`** methods. A silent structural mock needs those no-op methods and a destination implementing `write`. `info`, `warn`, `error`, `debug`, `fork`, and `label` remain. The real logger can also be captured from an integration hook, avoiding another mock. [Exact logger source](https://github.com/withastro/astro/blob/astro%407.3.2/packages/astro/src/core/logger/core.ts)

## Development server: retain evidence, replace assumptions

Astro still exposes the Vite server through `astro:server:setup`, and its startup still calls `await viteServer.listen(port)` followed by `viteServer.httpServer.address()`. Therefore the current middleware-mode `listen` override and address shim have not become automatically unnecessary. The shim is not a real HTTP server, so future calls to HTTP lifecycle methods need scrutiny. [Dev startup](https://github.com/withastro/astro/blob/astro%407.3.2/packages/astro/src/core/dev/container.ts), [server setup hook](https://github.com/withastro/astro/blob/astro%407.3.2/packages/astro/src/integrations/hooks.ts)

The rejection listener also remains. The server plugin installs it when SSR or prerender handlers exist and unregisters it from `viteServer.httpServer?.on('close', ...)`. A middleware-mode server has no HTTP close event. The plugin returns early when `process.env.VITEST` is set, so a passing unit test can miss this lifecycle path. **Do not simply delete the workaround on the claim that Astro fixed it.** Replace `process.removeAllListeners('unhandledRejection')` with cleanup scoped to the listener(s) introduced by this server, or arrange a real lifecycle callback; verify repeated start/stop preserves unrelated process listeners. [Astro 7.3.2 server plugin](https://github.com/withastro/astro/blob/astro%407.3.2/packages/astro/src/vite-plugin-astro-server/plugin.ts)

Astro's own module loader uses `ssrEnvironment.runner.import`, the environment's module graph, and its plugin container. Mighty uses `viteServer.ssrLoadModule`, merged `moduleGraph`, and `ModuleNode.ssrModule`. **Those Vite APIs still exist in 8.0.13.** However, `ssrLoadModule` owns a separate `SSRCompatModuleRunner`, requires a runnable `ssr` environment, disables HMR on that runner, and populates `ssrModule` for compatibility. This is a reason to test the current path, not a verified removal requiring blind substitutions. If switching to the environment runner, update the CSS traversal and module-state assumptions together; changing only the import calls loses the compatibility runner's `ssrModule` population. [Astro loader](https://github.com/withastro/astro/blob/astro%407.3.2/packages/astro/src/core/module-loader/vite.ts), [Vite SSR compatibility loader](https://github.com/vitejs/vite/blob/v8.0.13/packages/vite/src/node/ssr/ssrModuleLoader.ts), [Vite module graph compatibility](https://github.com/vitejs/vite/blob/v8.0.13/packages/vite/src/node/server/mixedModuleGraph.ts)

Astro's old `vite-plugin-astro-server/css.ts`, copied into Mighty, is no longer the current upstream implementation. Astro 7 uses `vite-plugin-css` with environment-local traversal, `fetchModule`, CSS content caching, and generated per-page CSS modules. Keep the copied code only if nested CSS, imported CSS, hydration, and edits/HMR pass; otherwise port its responsibilities to the new environment model. The current `createResolve()` use of `environment.pluginContainer.resolveId()` matches Astro's loader approach. [Current CSS plugin](https://github.com/withastro/astro/blob/astro%407.3.2/packages/astro/src/vite-plugin-css/index.ts)

## Renderer entrypoint nuance

The new path is **`@astrojs/react/container-renderer` for `getContainerRenderer`**; `astro/container` itself did not move. The same dedicated subpath exists for other official UI renderers. Mighty does not currently import that helper, so no existing import needs this rename. [Container documentation](https://docs.astro.build/en/reference/container-reference/#adding-a-renderer-through-the-container-api)

Mighty harvests renderer definitions by rerunning integration setup, then imports their server entrypoints. Its production path already gets loaded renderers from the built manifest. If renderer discovery is redesigned, dedicated helpers are useful for known frameworks but cannot replace script injection from Alpine/Partytown or arbitrary third-party integration hooks. Keep generic integration support in the design; do not introduce a React-only hardcoded loader. `astro:container` provides `loadRenderers()` inside Vite; outside Vite the documented path is manual runtime renderer imports. [Virtual renderer loader](https://github.com/withastro/astro/blob/astro%407.3.2/packages/astro/src/virtual-modules/container.ts), [React helper](https://github.com/withastro/astro/blob/%40astrojs/react%406.0.5/packages/integrations/react/src/container-renderer.ts)

## Rust compiler and fixtures

Astro 7 defaults to the Rust compiler and JSX whitespace handling. Unclosed non-void tags must be closed; invalid nesting is no longer repaired. CSS serialization can change. `compressHTML: true` retains the former whitespace policy; alternatively accept the new default and fix deliberate spaces with explicit `{" "}`. [Astro v7 migration guide](https://docs.astro.build/en/guides/upgrade-to/v7/#rust-compiler)

Concrete Mighty expectations to review are `packages/core/tests/dev/basic.test.ts:76` and `packages/core/tests/start/basic.test.ts:67`: both embed spaces around `body` and `p` produced by the old compiler. Prefer adopting Astro's default and updating those expectations after observing output. Do not claim every snapshot changes: simple single-paragraph and React-fragment expectations may remain identical. Existing style matchers tolerate some output differences, but verify their results. `dev/basic/src/pages/error.astro` intentionally has invalid frontmatter (`;=`); preserve its failure purpose. I found no specific unintentionally unclosed non-void fixture requiring an edit during source inspection; confirm by compiling the fixtures under Astro 7.

## Vite 8 impact on Mighty plugins

Align core's direct Vite dependency with Astro's Vite 8 range so Vite types and runtime are not split across majors. Vite 8 uses Rolldown/Oxc, renames `build.rollupOptions` to `build.rolldownOptions`, and removes several Rollup-only hooks. The current core plugin only defines `closeBundle`; the audited core source does not use the removed hooks or mutate bundle output. `packages/core/tests/fixture.ts:122` does use `rollupOptions.external`: migrate that deprecated spelling to `rolldownOptions.external`. The new `moduleType: 'js'` requirement for plugins transforming other formats is relevant to custom integrations, but there is no such core transform hook to rewrite here. [Vite migration](https://vite.dev/guide/migration)

## Implementation boundary and acceptance checks

Required from verified source evidence: update Astro/official integration/Vite versions together; fix or remove the logger mock; decide and test the whitespace policy. Rename the deprecated Vite fixture option while touching it. Other server and manifest changes above are **verification-dependent**, not demonstrated runtime failures.

Before declaring compatibility, run the repository's build, typecheck, Biome, and test suite, then check dev start/stop outside Vitest, context propagation, React hydration asset requests, nested CSS and CSS edits, overlay-disabled error propagation, and SSR/prerender output with inline/external styles. Inspect generated manifest keys and page exports directly. No production implementation changes were made for this research.

## Surrounding packages and repository-specific changes

The following are source-audit findings against the current repository at `6c7ca1d7ffab6494602db5d72720e764b8b00465`. “Required” identifies a concrete incompatible shape or published requirement. “Verify” identifies a behavior to exercise when implementing the upgrade, not a demonstrated failure.

### Hono 4.13 and the Node adapter 2

**No required Hono import rewrite was identified.** Mighty uses `createMiddleware` from `hono/factory`, `Context`, `MiddlewareHandler`, `UnofficialStatusCode`, and augments `ContextRenderer`; the Hono 4.13 release does not remove these surfaces. Its changes include new QUERY support, changed cache keys, CORS defaults, earlier RegExpRouter errors, and JSX ref types. This repository does not use those middleware or JSX APIs. Verify the existing Hono render/shared-context tests and route registration after the catalog bump. [Hono 4.13 release](https://github.com/honojs/hono/releases/tag/v4.13.0), [published exports](https://registry.npmjs.org/hono/4.13.0), [Mighty Hono types](https://github.com/gomighty/mighty/blob/6c7ca1d7ffab6494602db5d72720e764b8b00465/packages/hono/src/types.ts).

**The Node adapter v2 retains the public API**, including the documented `serve(app)` form. Its two declared breaking changes are Node 18 removal and removal of `@hono/node-server/vercel`; it requires Node >=20 and peers on Hono ^4. Mighty declares the package but has no direct import in its adapter source, so this needs a catalog update, not a `serve` call rewrite. Later CLI/sidecar work should test real HTTP requests, headers and body handling; today's Hono fixtures use `app.request()` and cannot validate Node transport. [Official v2 release](https://github.com/honojs/node-server/releases/tag/v2.0.0), [package metadata](https://registry.npmjs.org/@hono%2fnode-server/2.0.0).

### Vitest 5

**Required:** rewrite `packages/core/tests/matchers.d.ts`. It currently augments `Assertion<T>` and `AsymmetricMatchersContaining`; Vitest 5 distinguishes return type `R` from received type `T` and recommends one `Matchers<R, T>` augmentation. Keep the `arrayMatching(expected: RegExp[]): R` signature and the existing runtime `expect.extend` implementation. [Matcher documentation](https://vitest.dev/guide/extending-matchers), [current declaration](https://github.com/gomighty/mighty/blob/6c7ca1d7ffab6494602db5d72720e764b8b00465/packages/core/tests/matchers.d.ts).

**No project restructuring is indicated:** root `projects: ["packages/*"]` references directories; Vitest 5's new inheritance and shared Vite server defaults apply to inline projects. The current asynchronous assertions are awaited, the console spy is installed per test and restored afterward, and no browser tests, benchmark API, nested hoisted mocks, sequential options, or coverage configuration were found. Those migration changes therefore do not require speculative edits. Verify tests under Vitest 5 after the matcher update. [Migration guide](https://vitest.dev/guide/migration/).

The exact `vitest@5.0.0` engine range is `^22.12.0 || ^24.0.0 || >=26.0.0`, with Vite peers `^6.4.0 || ^7.0.0 || ^8.0.0`; the map's Node 22/24/26 matrix fits. [Published package](https://registry.npmjs.org/vitest/5.0.0).

### tsdown 0.23

**Required build environment:** `^22.18.0 || ^24.11.0 || >=26.0.0`. This is stricter than Astro's Node 22.12 runtime floor. Build CI should use current patches of Node 22/24/26; do not claim a full source build works on Node 22.12. Keeping a 22.12 application-runtime promise requires a separate smoke test of packed output on that version. No decision to raise the published runtime floor is made here. [0.23 migration](https://github.com/rolldown/tsdown/releases/tag/v0.23.0), [exact engines](https://registry.npmjs.org/tsdown/0.23.0).

Current configuration already uses `copy`, `dts: true`, ESM, Node platform and bundler module resolution; none of the removed `bundle`, `publicDir`, `outExtension`, generator booleans or programmatic `build()` return values is used. The 0.22 transition adds native TypeScript config loading and bin detection, and 0.23 changes dependency-subpath resolution defaults. Verify that the emitted `mighty-hono` bin still points to `dist/cli.mjs`, that all declared `.mjs` exports and declarations exist, and that Astro subpath imports stay external and resolve in an installed package. The maintainers recommend one 0.22.14 build to expose deprecated options before 0.23; this is a tooling check, not an intermediate Astro release. [0.22 release](https://github.com/rolldown/tsdown/releases/tag/v0.22.0), [0.23 release](https://github.com/rolldown/tsdown/releases/tag/v0.23.0), [core build config](https://github.com/gomighty/mighty/blob/6c7ca1d7ffab6494602db5d72720e764b8b00465/packages/core/tsdown.config.ts).

### Biome 2.5

**Required cleanup for this repository:** update the pinned package and schema together; migrate `linter.rules.recommended: true` to `preset: "recommended"`. The old field still works in 2.5 but is deprecated. SVG support expands the files checked by the existing broad include. [Biome 2.5 announcement](https://biomejs.dev/blog/biome-v2-5/).

A read-only `pnpm --package=@biomejs/biome@2.5.0 dlx biome ci --reporter=concise` run, without changing the lockfile or configuration, exited 1 with **five errors**: `noSvgWithoutTitle` twice each in `packages/docs/public/favicon.svg` and `packages/docs/src/assets/mighty.svg`, and `useHeadingContent` on the `set:html` heading in `packages/docs/src/components/starlight/Hero.astro`. It also reported the schema mismatch and deprecated recommended field. Address SVG accessibility semantics and the dynamic heading diagnostic during the docs work; preserve the agreed logo artwork. The heading diagnostic alone does not prove the rendered page lacks heading text. This was a real target-version lint probe, not an upgraded application test.

### Starlight 0.42 and docs dependencies

**Required:** upgrade Astro and Starlight together. Starlight 0.41 dropped Astro 6; 0.42 requires Astro >=7.2.10 within major 7 and updates its Markdown/MDX stack. Astro 7.3.2 meets that requirement. Update `starlight-links-validator` to a compatible version: published 0.26.0 peers on Astro >=7.2.10 and Starlight >=0.42.0. [Starlight 0.41](https://github.com/withastro/starlight/releases/tag/@astrojs/starlight@0.41.0), [0.42](https://github.com/withastro/starlight/releases/tag/@astrojs/starlight@0.42.0), [validator 0.26](https://github.com/HiDeoo/starlight-links-validator/releases/tag/starlight-links-validator@0.26.0), [validator metadata](https://registry.npmjs.org/starlight-links-validator/0.26.0).

**Required if reusing the current sidebar:** each of the three groups in `packages/docs/astro.config.mjs` must wrap `autogenerate` in `items: [{ autogenerate: ... }]`. This change arrived in 0.39, so looking only at 0.42 release notes misses a concrete break. Autogenerated subgroup collapse inheritance also changed; the current config does not set `collapsed`. [Starlight 0.39 migration](https://github.com/withastro/starlight/releases/tag/@astrojs/starlight@0.39.0).

Starlight 0.42 replaces the old mobile menu wrapper and expanded-state attributes with popover markup, distributes JavaScript plus declaration files instead of TypeScript sources, and removes an unused top-level `tagline` option. That removal does **not** mean removing the current page frontmatter `hero.tagline`. Current CSS does not target the removed menu selectors; keep that true in the planned blank-Starlight redesign and verify menu behavior. Its supported browser floor becomes Chromium 116, Safari 17, Firefox 125. [Starlight 0.42 release](https://github.com/withastro/starlight/releases/tag/@astrojs/starlight@0.42.0).

The map already assigns visual direction and content to their own decisions. These compatibility findings feed that work; they do not authorize retaining the current design. After upgrade run `pnpm build:docs` as well as `astro check`: the root `pnpm build` builds libraries only. Current `.github/workflows/ci.yml` already has a Vitest job on Node 24, so the map's CI work should expand its matrix rather than add a duplicate test job. [Current scripts](https://github.com/gomighty/mighty/blob/6c7ca1d7ffab6494602db5d72720e764b8b00465/package.json), [current CI](https://github.com/gomighty/mighty/blob/6c7ca1d7ffab6494602db5d72720e764b8b00465/.github/workflows/ci.yml).

## Consolidated changes for the later execution issue

1. Update the Astro catalog to the selected pinned 7.x range, align both direct Vite declarations to 8.x, update the official Astro integrations, and regenerate the lockfile. Keep the final Astro pin coupled to the internal-contract tests.
2. Repair or replace the integration logger mock; preserve generic renderer and integration-script handling. The `container-renderer` helper relocation is not a relocation of `astro/container`.
3. Compile every Astro fixture with the Rust compiler; choose the whitespace policy, fix confirmed invalid markup, and update only expectations whose output actually changes. Migrate `rollupOptions.external` in both core and Hono fixture helpers to the Vite 8 spelling.
4. Verify manifest entry-module keys, `page()` wrappers, nested page imports, and inline/external styles. Keep prerender redirects before on-demand module/style lookup.
5. Verify dev server lifecycle outside Vitest, preserve unrelated rejection listeners, and migrate SSR loading and CSS traversal together if the compatibility path fails. The CSS and base-prefix decision tickets own the design choice.
6. Bump Hono and its Node adapter, migrate the Vitest matcher declaration, verify tsdown package output and CLI bin, and use supported Node patches in CI. Extend the existing Vitest job.
7. Upgrade the docs dependency set together, migrate autogenerated sidebar groups, resolve the target-Biome diagnostics, and test the rebuilt docs including mobile navigation. Keep the redesign and content decisions with their existing tickets.

## Verification and limits

On Node 24.21.0 with pnpm 10.30.1, after `pnpm install --frozen-lockfile`:

| Check | Result |
| --- | --- |
| `pnpm build` | Passed with the current lockfile. |
| `pnpm run typecheck` | Passed; docs check reported no errors, warnings, or hints. |
| `pnpm run ci:biome` | Passed after isolating downloaded research sources from lint traversal. |
| `pnpm test` | Passed: 12 files, 50 tests. |
| Read-only Biome 2.5 probe | Failed with the five repository diagnostics described above. |

The first baseline lint attempt scanned unpacked upstream source under the gitignored `.context` directory because Biome 2.4 does not honor the relevant Git exclude mechanism. Adding a local `.context/.gitignore` isolated research scratch files; the unmodified repository then passed. Biome 2.5 already respected those excludes.

The normal suite validates the existing Astro 6 codebase only. This research inspected exact Astro/Vite packages and official source/release documentation; it did not install the full upgraded dependency set, run Mighty on Astro 7, validate browser HMR, or build the redesigned docs. The acceptance checks above belong in execution; they are not claimed as completed here.

## Map handoff

The remaining questions already have tickets: [Dev CSS without vendored Astro code](https://github.com/gomighty/mighty/issues/32), [What the /__mighty__ dev base prefix is for](https://github.com/gomighty/mighty/issues/33), [Hono adapter API for 0.1](https://github.com/gomighty/mighty/issues/39), [Monorepo layout and release pipeline](https://github.com/gomighty/mighty/issues/42), and [Docs content pass](https://github.com/gomighty/mighty/issues/46). [Cut the execution issues for 0.1.0](https://github.com/gomighty/mighty/issues/47) should carry the consolidated change list and runtime checks into the upgrade issue. No new design ticket or fog graduation is needed from these findings.
