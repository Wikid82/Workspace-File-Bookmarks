#!/bin/bash

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "============================================================================"
echo "Updating Global npm Environment"
echo "============================================================================"

echo "Current local versions (npm / npx):"
npm -v && npx -v

echo -n "Latest available npm version on registry: "
npm view npm version

echo "Installing latest global npm..."
npm install -g npm@latest
echo ""

# ---------------------------------------------------------------------------
# npm modules
# ---------------------------------------------------------------------------
# Workspace File Bookmarks is a single VS Code extension package, so there's
# just one npm module today. Kept as an array in case that ever changes.

NPM_MODULES=(
    "$REPO_ROOT"
)

for (( i=0; i<${#NPM_MODULES[@]}; i++ )); do
    MODULE="${NPM_MODULES[i]}"
    echo "============================================================================"
    echo "Updating: $MODULE"
    echo "============================================================================"

    cd "$MODULE" || exit 1


    
    # Update prod, dev, optional, and peer dependencies to latest.
    # Exclude typescript: staying under v7 until there's a typescript-eslint
    # release with a v7-compatible API (no ESLint API support until 7.1):
    # https://github.com/typescript-eslint/typescript-eslint/issues/10940
    npx --yes npm-check-updates -u --reject "typescript,@typescript-eslint/*"

    # ncu only touches dependency ranges, not engines.vscode, so keep the
    # minimum supported VS Code version in lockstep with @types/vscode here.
    # vsce refuses to package when engines.vscode is behind @types/vscode.
    # Single-quoted on purpose: the ${...} below is a JS template literal
    # for node to evaluate, not a shell expansion.
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
    rm -rf node_modules package-lock.json
    npm install --legacy-peer-deps
    npm dedupe --legacy-peer-deps
    npm run build
    npm run lint
    npm run test
    # Fails on high/critical findings; moderate/low are allowed through.
    npm audit --audit-level=high
    npm audit fix --legacy-peer-deps || true
    npm outdated || true

    echo "Done: $MODULE"
done

echo ""
echo "All npm dependencies updated successfully."
