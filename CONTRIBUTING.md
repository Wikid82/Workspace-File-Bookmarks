# Contributing

Thanks for considering a contribution to Workspace File Bookmarks. This
document covers the workflow, tooling, and quality bar a PR is expected to
meet.

## Branching model

- Branch off `development`, not `main` — `main` only moves via
  `development` → `main` promotion or direct CI/hotfix commits.
- Feature work happens on `feature/**` branches, one PR per feature. A PR
  may be split into multiple commits, but don't merge a feature that isn't
  complete. If your change spans multiple unrelated features, split it into
  multiple PRs rather than combining them.
- `development` batches dependency and small maintenance updates so a merge
  into `main` doesn't trigger a release per commit. Once `development`'s CI
  is green, a weekly `promote-dev-to-main` PR opens the other direction.
- release-please drives versioning and changelog generation off Conventional
  Commit prefixes on `main` — see [Commit messages](#commit-messages) below.

## Getting started

```bash
npm install        # also wires up lefthook's pre-commit checks
npm run build       # bundle extension.ts -> dist/extension.cjs
npm run watch       # rebuild on change
```

Press `F5` in VS Code to launch an Extension Development Host with the
extension loaded, so you can exercise your change interactively.

## Commit messages / PR titles

PR titles must follow [Conventional Commits](https://www.conventionalcommits.org/)
(`feat:`, `fix:`, `chore:`, `docs:`, etc.) — this is enforced by
`.github/workflows/pr-title-lint.yml` and is what release-please uses to
decide the next version and changelog entry on `main`.

## Definition of Done

Every change is expected to clear this bar before it's mergeable:

- **CI clean.** `npm run lint` (type-check via `tsc --noEmit`, then
  `eslint .`), `npm run format:check`, `npm run test`, `npm run build`, and
  `npm run test:e2e` all pass — see `.github/workflows/ci.yml`.
- **Unit coverage ≥85%, both patch and project.** Codecov enforces this on
  every PR (`codecov.yml`), reported from `npm run test:coverage` (vitest +
  v8; `vitest.config.mts` mirrors the same 85% thresholds so a local run
  fails the same way CI's will). Before pushing, run
  `scripts/local-patch-report.sh` — it diffs your branch against
  `origin/development`, regenerates a fresh coverage profile, and reports
  the same changed-lines coverage number Codecov's patch gate computes, so a
  real gap shows up before a CI round-trip instead of after. Write real
  tests that close gaps for real — no padding, no vacuous assertions just to
  move a number.
- **New features carry e2e coverage, not just unit tests.** Unit tests
  (vitest, against `test/vscode-mock.ts`) cover logic in isolation;
  `test/e2e/*.test.ts` (mocha, via `@vscode/test-cli` + `@vscode/test-electron`)
  runs the real, built extension inside an actual VS Code Extension
  Development Host. Any new user-facing command or tree behavior needs both:
  a unit test for the logic and an e2e test exercising it end-to-end. Run
  locally with `npm run test:e2e` (needs a display, or `xvfb-run -a npm run
  test:e2e` on headless Linux).
- **Security scanning clean.** CodeQL runs on every push/PR
  (`.github/workflows/codeql.yml`); `npm audit --audit-level=high` gates
  dependency updates on high/critical findings.

## Local pre-commit checks

`npm install` runs [lefthook](https://github.com/evilmartians/lefthook)'s
`postinstall` hook, which installs a `pre-commit` hook (see `lefthook.yml`)
that runs lint, format, and the unit suite against your staged files. This
catches most Definition of Done violations before they reach CI — if it's
slow or wrong, please open an issue rather than routinely bypassing it with
`--no-verify`.

## Opening a PR

Fill out the PR template's checklist — it mirrors the Definition of Done
above. Link the issue it closes, if any.
