## Quality

Check your work using the verification suite below.

```sh
pnpm build                              # Build all packages (required before test/typecheck)
pnpm run typecheck                      # Typecheck
pnpm run ci:biome                       # Format + lint check
pnpm test                               # Run tests
```

## Agent skills

### Issue tracker

Issues and specs are tracked in GitHub Issues. See `docs/agents/issue-tracker.md`.

### Triage labels

Triage uses the five default canonical labels. See `docs/agents/triage-labels.md`.

### Domain docs

Domain documentation uses the single-context layout. See `docs/agents/domain.md`.
