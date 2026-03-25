# Mighty Docs

This directory contains the Mighty documentation site migrated from `gomighty/docs` into the `gomighty/mighty` monorepo.

## Package manager

This project now uses **pnpm** (not Bun).

## Run locally

From the repository root:

```bash
pnpm install
pnpm --dir packages/docs dev
```

## Build and preview

```bash
pnpm --dir packages/docs build
pnpm --dir packages/docs preview
```

## Update Vercel project settings via Vercel CLI

Use the Vercel CLI to re-link this docs project and sync/update configuration:

```bash
pnpm dlx vercel@latest login
pnpm dlx vercel@latest link --cwd packages/docs
pnpm dlx vercel@latest pull --yes --environment=production --cwd packages/docs
```

To deploy from the CLI:

```bash
pnpm dlx vercel@latest deploy --prod --cwd packages/docs
```

If your existing Vercel project still points to the old `gomighty/docs` repo, run `vercel link` again and select the `gomighty/mighty` repository plus the `packages/docs` root directory when prompted.
