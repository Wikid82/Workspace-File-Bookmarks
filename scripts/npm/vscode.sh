#!/bin/bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

NPM_MODULES=(
        "$REPO_ROOT"
    )

for MODULE in "${NPM_MODULES[@]}"; do
    echo "============================================================================"
    echo "Updating: $MODULE"
    echo "============================================================================"

    cd "$MODULE" || exit 1
    rm -rf node_modules package-lock.json
    npm install @types/vscode @vscode/vsce --save-dev

    # Keep engines.vscode in lockstep with @types/vscode — vsce refuses to
    # package when engines.vscode is behind it. Single-quoted on purpose: the
    # ${...} below is a JS template literal for node, not a shell expansion.
    # shellcheck disable=SC2016
    node -e '
        const fs = require("fs");
        const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
        const typesVersion = pkg.devDependencies?.["@types/vscode"]?.replace(/^[^0-9]*/, "");
        if (typesVersion && pkg.engines?.vscode) {
            pkg.engines.vscode = `^${typesVersion}`;
            fs.writeFileSync("package.json", JSON.stringify(pkg, null, 2) + "\n");
        }
    '
done
