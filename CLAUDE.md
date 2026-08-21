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

- **CI clean.** `npm run lint` (`tsc --noEmit`), `npm run test`, and
  `npm run build` all pass — see `.github/workflows/ci.yml`.
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
- **Security scanning clean.** CodeQL runs on every push/PR
  (`.github/workflows/codeql.yml`); `npm audit --audit-level=high` (via
  `scripts/wfb_dep_update.sh`) gates dependency updates on high/critical
  findings.
