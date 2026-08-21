#!/usr/bin/env bash
set -euo pipefail

# Local patch-coverage preflight. Reports the same "patch coverage" number
# Codecov's `patch` gate computes (coverage.status.patch in codecov.yml) —
# coverage of only the lines changed in your diff, not the whole project —
# so a real gap shows up before a CI round-trip instead of after. Ported
# from Hestia's scripts/local-patch-report.sh, simplified for a single-
# package TS project: one lcov profile, no backend/frontend split, no path
# prefix translation (vitest's lcov.info already uses repo-root-relative
# paths). See CLAUDE.md's Definition of Done section.
#
# Usage: scripts/local-patch-report.sh [--base <ref>]
# Env:   WFB_MIN_COVERAGE (default 85) — minimum patch coverage percent.
#        WFB_PATCH_ADVISORY=1 — report only, don't fail on a gap below the
#        minimum (still prints PASS/FAIL either way).

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

BASE_REF="origin/development"
if [ "${1:-}" = "--base" ]; then
    BASE_REF="$2"
fi

MIN_COVERAGE="${WFB_MIN_COVERAGE:-85}"
ADVISORY="${WFB_PATCH_ADVISORY:-0}"

MERGE_BASE="$(git merge-base "$BASE_REF" HEAD)"
echo "Diffing HEAD against ${BASE_REF} (merge-base ${MERGE_BASE:0:12})"
echo ""

# Same exclusions as codecov.yml's ignore: list — keep the two in sync
# manually.
DIFF_FILE="$(mktemp)"
trap 'rm -f "$DIFF_FILE"' EXIT

git diff --unified=0 "$MERGE_BASE"...HEAD -- \
    '*.ts' \
    ':(exclude)test/**' \
    ':(exclude)**/*.test.ts' \
    ':(exclude)**/*.d.ts' \
    ':(exclude)vitest.config.mts' \
    >"$DIFF_FILE"

if [ ! -s "$DIFF_FILE" ]; then
    echo "No coverable changed lines in the diff — nothing to report."
    exit 0
fi

echo "--- Regenerating coverage profile ---"
# The project-wide threshold gate in vitest.config.mts may fail here (that's
# a different, stricter question than patch coverage) — don't let it abort
# this script; only a real test failure (no lcov produced at all) should.
npm run test:coverage >/dev/null || true
if [ ! -f "$ROOT_DIR/coverage/lcov.info" ]; then
    echo "FAIL: tests did not produce a coverage profile" >&2
    exit 1
fi

echo ""
echo "--- Patch coverage ---"

python3 - "$DIFF_FILE" "$ROOT_DIR" "$MIN_COVERAGE" "$ADVISORY" <<'PY'
import re
import sys

diff_file, root_dir, min_coverage_raw, advisory_raw = sys.argv[1:5]
min_coverage = float(min_coverage_raw)
advisory = advisory_raw == "1"


def parse_diff_changed_lines(path):
    """Return {file_path: set(added_line_numbers)} from a unified=0 diff."""
    changed = {}
    current_file = None
    current_line = None
    hunk_re = re.compile(r"^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@")

    with open(path) as f:
        for line in f:
            if line.startswith("+++ b/"):
                current_file = line[6:].rstrip("\n")
                changed.setdefault(current_file, set())
                current_line = None
                continue
            if line.startswith("--- ") or line.startswith("diff --git"):
                continue
            m = hunk_re.match(line)
            if m:
                current_line = int(m.group(1))
                continue
            if current_file is None or current_line is None:
                continue
            if line.startswith("+") and not line.startswith("+++"):
                changed[current_file].add(current_line)
                current_line += 1
            elif line.startswith("-") and not line.startswith("---"):
                continue
            else:
                current_line += 1
    return {f: lines for f, lines in changed.items() if lines}


def parse_lcov(path):
    """Return {file_path: {line: hit_count}} from an lcov.info file."""
    result = {}
    current = None
    try:
        with open(path) as f:
            for line in f:
                line = line.strip()
                if line.startswith("SF:"):
                    current = line[3:]
                    result.setdefault(current, {})
                elif line.startswith("DA:") and current is not None:
                    parts = line[3:].split(",")
                    ln, hits = int(parts[0]), int(parts[1])
                    per_line = result[current]
                    per_line[ln] = per_line.get(ln, 0) or hits
                elif line == "end_of_record":
                    current = None
    except FileNotFoundError:
        pass
    return result


changed = parse_diff_changed_lines(diff_file)
lcov = parse_lcov(f"{root_dir}/coverage/lcov.info")

total_coverable = 0
total_covered = 0
rows = []

for file_path, lines in sorted(changed.items()):
    per_line = lcov.get(file_path, {})
    coverable = [ln for ln in sorted(lines) if ln in per_line]
    if not coverable:
        continue
    covered = [ln for ln in coverable if per_line[ln] > 0]
    total_coverable += len(coverable)
    total_covered += len(covered)
    pct = 100.0 * len(covered) / len(coverable)
    rows.append((file_path, len(covered), len(coverable), pct))

for file_path, covered, coverable, pct in rows:
    uncovered_note = "" if covered == coverable else "  <-- gap"
    print(f"  {pct:6.1f}%  ({covered}/{coverable})  {file_path}{uncovered_note}")

if total_coverable == 0:
    print("\nNo changed lines overlapped with coverage data (e.g. non-statement lines only).")
    sys.exit(0)

overall = 100.0 * total_covered / total_coverable
print(f"\nPatch coverage: {overall:.1f}% ({total_covered}/{total_coverable}) — minimum {min_coverage}%")

if overall < min_coverage:
    print("FAIL: patch coverage below minimum" + (" (advisory — not failing)" if advisory else ""))
    sys.exit(0 if advisory else 1)

print("PASS: patch coverage meets the minimum")
PY
