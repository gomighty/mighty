Before finishing your work, you must run the FULL verification suite below.

```sh
pnpm build                              # Build all packages (required before test/typecheck)
pnpm run typecheck                      # Typecheck
pnpm run ci:biome                       # Format + lint check
pnpm test                               # Run tests
```

If issues arise, fix the issues and run the FULL verification suite again. Repeat this process until the ENTIRE suite passes.

Use the following command to fix format and lint issues.

```sh
  pnpm exec biome check --write <files>   # Format + lint fix
```
