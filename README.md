# Mighty

Mighty is an Astro rendering runtime split into two workspace packages:

- `@gomighty/core`: build, dev, start, and shared request context primitives.
- `@gomighty/hono`: a Hono adapter and CLI on top of `@gomighty/core`.

## Workspace

```text
packages/
  core/  Astro runtime and build pipeline
  hono/  Hono middleware adapter and CLI
```

## Development

```sh
pnpm install
pnpm build
pnpm run typecheck
pnpm run ci:biome
pnpm test
```

## Notes

- Astro internals are intentionally isolated under `packages/core/src/astro`.
- The Hono adapter accepts explicit `mode` and `root` options so app behavior is not tied to `NODE_ENV` or a fixed `./astro` layout.
