# Workspace File Bookmarks

A VS Code extension (single-file `extension.ts`, esbuild-bundled) that lets
users bookmark files across a multi-root/multi-repo workspace.

## Workflow

Feature work happens on `feature/**` branches, one PR per feature. A PR may
be split into multiple commits, but never merge a feature that isn't
complete — don't land it half-done. If a task spans multiple features, split
it into multiple PRs (one per feature) rather than combining them into one.
`development` batches dependency updates so a merge into
`main` doesn't trigger a release per commit. `main` is only touched directly
for CI fixes or hotfixes, which then propagate back down to `development` via
the `propagate-main-to-development` workflow. `promote-dev-to-main` opens a
weekly PR the other direction once `development`'s CI is green. release-please
drives versioning and publishing off Conventional Commit prefixes on `main`.

## Definition of Done

Every change is expected to clear this bar before it's mergeable:

- **CI clean.** `npm run lint` (`npm run lint:types` — `tsc --noEmit` —
  followed by `npm run lint:style` — `eslint .`), `npm run format:check`,
  `npm run test`, `npm run build`, and `npm run test:e2e` all pass — see
  `.github/workflows/ci.yml`. `lefthook` runs the same lint/format checks and
  the unit suite locally on `pre-commit` against staged files (installed
  automatically via the `postinstall` script after `npm install`; see
  `lefthook.yml`), so most of this is caught before it ever reaches CI.
- **Unit coverage ≥85%, both patch and project.** Codecov enforces this on
  every PR (`codecov.yml`: `project` and `patch`, both `target: 85%,
  threshold: 1%`), reported from `npm run test:coverage` (vitest + v8,
  `vitest.config.mts` mirrors the same 85% thresholds so a local run fails
  the same way CI's will). Before pushing, run
  `scripts/local-patch-report.sh` to check the *patch* number locally — it
  diffs your branch against `origin/development`, regenerates a fresh
  coverage profile, and reports the same changed-lines coverage number
  Codecov's patch gate computes, so a real gap shows up before a CI
  round-trip instead of after. Write real tests that close gaps for real —
  no padding, no vacuous assertions just to move a number.
- **New features carry e2e coverage, not just unit tests.** Unit tests
  (vitest, against `test/vscode-mock.ts`) cover logic in isolation;
  `test/e2e/*.test.ts` (mocha, via `@vscode/test-cli` + `@vscode/test-electron`)
  runs the real, built extension inside an actual VS Code Extension
  Development Host — real command registration, real tree view, real
  `workspaceState`. Any new user-facing command or tree behavior needs both:
  a unit test for the logic and an e2e test exercising it end-to-end through
  the real `vscode` API. Run locally with `npm run test:e2e` (builds the
  extension, bundles `test/e2e/**` with esbuild, then launches the test
  host — needs a display or `xvfb-run` on headless Linux).
- **Security scanning clean.** CodeQL runs on every push/PR
  (`.github/workflows/codeql.yml`); `npm audit --audit-level=high` (via
  `scripts/wfb_dep_update.sh`) gates dependency updates on high/critical
  findings.
