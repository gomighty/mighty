# Mighty

Monorepo for Mighty packages and docs.

## Install

```bash
pnpm install
```

## Workspace checks

```bash
pnpm build
pnpm run typecheck
pnpm run ci:biome
pnpm test
```

## Docs

The docs site lives in [`packages/docs/`](./packages/docs).

```bash
pnpm --dir packages/docs dev
```
