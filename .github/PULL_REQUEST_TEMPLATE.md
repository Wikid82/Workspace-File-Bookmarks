## Summary

<!-- What does this PR do, and why? Link the issue it closes, if any. -->

## Testing

<!-- How did you verify this? Include commands run and their output/result. -->

## Checklist

- [ ] PR title follows [Conventional Commits](https://www.conventionalcommits.org/) (enforced by `pr-title-lint.yml`)
- [ ] `npm run lint` passes (`tsc --noEmit` + `eslint .`)
- [ ] `npm run format:check` passes
- [ ] `npm run test` passes, and `npm run test:coverage` / `scripts/local-patch-report.sh` shows patch coverage ≥85%
- [ ] `npm run build` passes
- [ ] New/changed user-facing commands or tree behavior have `test/e2e/*.test.ts` coverage in addition to unit tests
- [ ] `npm run test:e2e` passes locally
- [ ] No new high/critical findings from `npm audit --audit-level=high` or CodeQL
