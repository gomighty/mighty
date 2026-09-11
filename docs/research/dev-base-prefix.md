# What the development asset base prefix is for

Research for [What the /__mighty__ dev base prefix is for](https://github.com/gomighty/mighty/issues/33), part of [Map: the way to Mighty 0.1.0](https://github.com/gomighty/mighty/issues/29), checked 2026-09-11. Repository behavior was inspected at `6c7ca1d7ffab6494602db5d72720e764b8b00465` (Astro 6.0.4 / Vite 7.3.1); target source and the isolated Vite experiment below use **Astro 7.3.2 / Vite 8.0.13**. Astro 7.3.2 declares Vite `^8.0.13`. This report supplies evidence for the separate [Dev asset base prefix decision](https://github.com/gomighty/mighty/issues/41); it does not choose the final configuration. [Current lockfile](https://github.com/gomighty/mighty/blob/6c7ca1d7ffab6494602db5d72720e764b8b00465/pnpm-lock.yaml), [target package](https://github.com/withastro/astro/blob/astro%407.3.2/packages/astro/package.json)

## Answer

`/__mighty__` gives development assets a reserved namespace on the backend's origin. It also tells Vite to generate matching module URLs, and participates in HMR URL construction. It is **not required by Vite middleware mode or Astro**. It is required by the current Hono adapter's coupled configuration, request dispatch and HTML address construction: changing just one breaks their agreement. The collision-avoidance purpose is an inference from that structure, not a recovered historical design note. [Hono adapter](https://github.com/gomighty/mighty/blob/6c7ca1d7ffab6494602db5d72720e764b8b00465/packages/hono/src/dev.ts)

A separate asset origin can use `/` as its Vite base because backend routes occupy a different origin. It still needs correct browser-visible URLs, CORS, and a working WebSocket endpoint. Laravel demonstrates this arrangement; removing the prefix alone does not implement it. A prefix can remain useful on the sidecar if assets share that origin with internal endpoints. These are topology choices, separate from the spelling `__mighty__`. [Laravel plugin v3.2.0](https://github.com/laravel/vite-plugin/blob/v3.2.0/src/index.ts), [Vite backend integration](https://github.com/vitejs/vite/blob/v8.0.13/docs/guide/backend-integration.md)

## What Mighty currently does

The Hono adapter defaults `vite.base` to `/__mighty__`, forwards GET requests whose pathname **contains** that string (plus exactly `/__open-in-editor`) into Vite's Connect middleware, and gives core an address such as `http://localhost:3000/__mighty__`. This is substring dispatch, not a strict mount boundary: `/orders/__mighty__/receipt` also matches. User config merges after the default base, while dispatch and address retain the hardcoded constant. A configurable prefix therefore requires one shared resolved value. [Adapter source](https://github.com/gomighty/mighty/blob/6c7ca1d7ffab6494602db5d72720e764b8b00465/packages/hono/src/dev.ts)

Core runs Astro with Vite middleware mode and `cors: false`. It supplies its own container resolver and inserts a placeholder address into hydration module URLs, the Vite client and integration page script. Rendering replaces that placeholder with the adapter's address. A separate regex catches quoted raw `/@fs/` image URLs. This does not rewrite every URL in arbitrary HTML, public references or CSS. [Core dev entry](https://github.com/gomighty/mighty/blob/6c7ca1d7ffab6494602db5d72720e764b8b00465/packages/core/src/dev/index.ts), [resolver](https://github.com/gomighty/mighty/blob/6c7ca1d7ffab6494602db5d72720e764b8b00465/packages/core/src/dev/resolve.ts)

The bridge adapts HTTP requests and responses; it does not forward WebSocket upgrades. This does **not** establish that current HMR is broken: Vite can run a separate HMR listener. [HTTP bridge](https://github.com/gomighty/mighty/blob/6c7ca1d7ffab6494602db5d72720e764b8b00465/packages/hono/src/utils/runConnectMiddleware.ts), [Vite WebSocket server](https://github.com/vitejs/vite/blob/v8.0.13/packages/vite/src/node/server/ws.ts)

The historical [Rename dev address path placeholder to `__mighty__`](https://github.com/gomighty/mighty/pull/21) replaced the old placeholder-shaped prefix; it does not document a requirement for the new spelling. No historical rationale was recovered in this investigation.

## Astro 7 and Vite URL rules

**Astro's application base and Vite's development base are distinct.** Astro 7's dev startup explicitly leaves its top-level `base` out of the initial Vite configuration; it uses that base for the browser's open URL. Astro has separate request middleware for stripping the application's base. User `config.vite` still merges into Vite, so Mighty can set `vite.base` independently. Do not replace Mighty’s setting with top-level `base` and assume equivalent behavior. [Astro dev startup](https://github.com/withastro/astro/blob/astro%407.3.2/packages/astro/src/core/dev/container.ts), [Vite config assembly](https://github.com/withastro/astro/blob/astro%407.3.2/packages/astro/src/core/create-vite.ts), [Astro base middleware](https://github.com/withastro/astro/blob/astro%407.3.2/packages/astro/src/vite-plugin-astro-server/base.ts)

Astro's resolver produces root-relative module URLs, `/@fs/...` or `/@id/...`, without a browser origin. Native Astro dev rendering includes a root-relative `/@vite/client`; its dev environment also emits CSS module scripts and inline styles. Mighty supplies its own resolver and head injection for container rendering, so those native paths are not an automatic replacement for Mighty’s address handling. [Astro resolver](https://github.com/withastro/astro/blob/astro%407.3.2/packages/astro/src/core/viteUtils.ts), [native dev head generation](https://github.com/withastro/astro/blob/astro%407.3.2/packages/astro/src/core/environment/dev-nonrunnable.ts)

Vite 8 applies these rules:

| Setting or mechanism | Effect in development |
| --- | --- |
| `base: '/__mighty__'` | Resolves to `/__mighty__/`; browser module imports receive that path prefix. |
| `base: ''` or `'./'` | Resolves to `/` during serve. It does not retain relative-base behavior. |
| `base: 'http://localhost:5173/assets/'` | Resolves to `/assets/` during serve; the origin is discarded. This is not how to configure a separate asset origin. |
| `server.origin` | Adds an origin to URLs produced by Vite's asset plugin, such as imported image URLs. It does not configure the listener or replace every URL in rendered HTML. |
| Base middleware | Strips a matching prefix before later Vite middleware. In middleware mode, requests outside the base continue instead of receiving the standalone server's redirect/error response. |

The first three rules come from [Vite config resolution](https://github.com/vitejs/vite/blob/v8.0.13/packages/vite/src/node/config.ts) and [import analysis](https://github.com/vitejs/vite/blob/v8.0.13/packages/vite/src/node/plugins/importAnalysis.ts). Asset URLs combine `server.origin`, decoded base and the file's public/root-relative/`@fs` path in [the asset plugin](https://github.com/vitejs/vite/blob/v8.0.13/packages/vite/src/node/plugins/asset.ts). The middleware rule is explicit in [base middleware](https://github.com/vitejs/vite/blob/v8.0.13/packages/vite/src/node/server/middlewares/base.ts).

Consequently, the prefix is a dispatch convention, not an access boundary enforced by Vite middleware mode. Mounting the complete Vite/Astro chain at `/` means choosing precedence against backend routes and public files; simply forwarding every unmatched URL also encounters Astro's page handling. Conversely, dispatching only `/@vite`, `/@id` and `/@fs` is incomplete: Vite also generates project-relative and dependency URLs. These are deductions from the middleware and URL-generation rules above. [Vite middleware ordering](https://github.com/vitejs/vite/blob/v8.0.13/packages/vite/src/node/server/index.ts), [Astro server plugin](https://github.com/withastro/astro/blob/astro%407.3.2/packages/astro/src/vite-plugin-astro-server/plugin.ts)

### HMR is a separate connection

Vite's injected client uses `hmr.protocol` or its own module URL's HTTP/HTTPS scheme, `hmr.host` or its module hostname, and `hmr.clientPort` then `hmr.port`. In middleware mode without a supplied `hmr.server`, it defaults the client port to **24678**. The HMR path starts with Vite base, with `hmr.path` joined when specified. Thus ordinary Hono asset HTTP can stay on port 3000 while HMR connects directly to port 24678. [Client config injection](https://github.com/vitejs/vite/blob/v8.0.13/packages/vite/src/node/plugins/clientInjections.ts), [browser client](https://github.com/vitejs/vite/blob/v8.0.13/packages/vite/src/client/client.ts)

Without an existing HTTP/HMR server, Vite creates a separate listener using `hmr.port` or 24678. When attached to a supplied server it handles upgrade events matching the configured HMR path. For a single public origin/port, supply or proxy a real upgrade-capable server and align the client-visible settings. Changing the prefix does not solve port collisions across workspaces, HTTPS, remote access or upgrade routing. [WebSocket implementation](https://github.com/vitejs/vite/blob/v8.0.13/packages/vite/src/node/server/ws.ts)

### Separate-origin sidecar and Laravel precedent

Laravel Vite plugin v3.2.0 defaults the dev base to `''` (Vite resolves `/`) and disables Vite's public directory. It configures CORS, puts a placeholder in `server.origin`, replaces that placeholder in transformed code, and writes the actual dev URL plus base to its hot file after listening. URL selection considers explicit origin, HMR settings and the bound address. The useful precedent is explicit discovery of the browser-visible asset address, independent of the backend origin. [Pinned Laravel implementation](https://github.com/laravel/vite-plugin/blob/v3.2.0/src/index.ts)

For Mighty, returning `http://localhost:5173` as the container address can put hydration and client scripts on that origin. Vite-transformed module imports then load from the module's origin; asset strings used in backend-rendered HTML or inline styles need their asset origin as well. Configure `server.origin` and audit other generated URLs instead of assuming a script's origin changes the document's URL resolution. Root-relative literal public assets still need an ownership policy. Vite's backend guide explicitly describes either proxying assets or setting `server.origin`. [Backend integration guide](https://github.com/vitejs/vite/blob/v8.0.13/docs/guide/backend-integration.md)

Core's current `cors: false` must change for cross-origin module loading. Use the intended backend origins. A browser-visible hostname/port may differ from the sidecar bind address, and HTTPS backends need compatible asset/HMR endpoints. Hot-file lifecycle and internal render endpoints belong to [Sidecar design](https://github.com/gomighty/mighty/issues/43); the prefix decision should specify the asset and HMR URL contracts that design consumes. [Vite server options](https://github.com/vitejs/vite/blob/v8.0.13/docs/config/server-options.md)

## Options for the dev asset base prefix decision

| Option | Advantages | Costs and constraints |
| --- | --- | --- |
| Keep a reserved prefix on Hono's origin | Clear division of asset and backend paths; reuses current HTTP bridge; no asset CORS needed. | Reserve a path namespace; keep base, dispatch and rendered address consistent; decide HMR port/upgrade handling separately. |
| Rename or configure that prefix | Same routing benefits; allows project-specific naming. | No inherent runtime improvement from renaming; replace every coupled use and handle slash/boundary normalization. |
| Use `/` for same-origin Hono assets | Avoids a custom mount path. | Must define Vite/Astro/backend route precedence and public-file ownership. An internal-path allowlist alone misses generated module paths. |
| Use `/` on a separate asset origin | Backend and asset routes cannot collide across origins; follows Laravel's dev layout. | Needs address discovery, CORS, asset-origin handling, and reachable HTTP/WS endpoints. Root paths can still collide with sidecar internal endpoints. |
| Keep a prefix on a separate asset origin | Reserves root space for sidecar controls or other services. | Adds configuration coordination without being necessary merely because assets are served separately. |

These trade-offs follow from the source behavior above; no option is selected here. Hono and Laravel need not use identical bases. What must agree within each topology is the rendered asset address, Vite's base/origin and the externally reachable HMR address.

## Validation and remaining implementation checks

An isolated **Vite 8.0.13** probe used `createServer({ root, configFile: false, appType: 'custom', server: { middlewareMode: true, ws: false, cors: false, watch: null } })`, mounted its middleware on a temporary Node HTTP listener, and fetched a module importing `dep.js` and `logo.png`, `logo.png?import`, and `@vite/client`. It observed:

| Input | Observed output |
| --- | --- |
| Base `/__mighty__` | Resolved base `/__mighty__/`; imports `/__mighty__/dep.js` and `/__mighty__/logo.png?import`; image export `/__mighty__/logo.png`. |
| Base `/`, origin `http://localhost:5173` | Module imports remain `/dep.js` and `/logo.png?import`; image export becomes `http://localhost:5173/logo.png`. |
| Absolute base `http://localhost:5173/assets/` | Resolved base `/assets/`; image export `/assets/logo.png`, without the input origin. |
| All middleware cases | Unprefixed `/main.js` also returned 200; generated client contained `const hmrPort = 24678`. |

This validates Vite transformations and middleware HTTP behavior, **not Astro 7 container rendering or a working WebSocket connection**: the probe deliberately disabled WS. Implementation checks should cover hydration plus nested imports, imported/public images, CSS asset URLs in inline styles, actual CSS/component edits, overlay and editor requests, backend path collisions, and custom base/origin combinations. Run actual HMR checks outside test mode.

The repository's current-lockfile verification passed build, typecheck and all 50 tests in 12 files. Those fixtures disable WebSockets and are not HMR or Astro 7 evidence. `pnpm run ci:biome` failed on nested root configurations in research worktrees under `.context`; the tracked-file equivalent passed all 107 files. These results establish the unchanged baseline, not implementation of any option above. No product code was changed.
