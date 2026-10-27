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

    if [ -n "$(npm pkg get overrides.@azure/msal-node)" ]; then
        LATEST="$(npm view @azure/msal-node version)"
        npm pkg set "overrides.@azure/msal-node=^${LATEST}"
        npm install
    else
        npm update @azure/msal-node
    fi
done
