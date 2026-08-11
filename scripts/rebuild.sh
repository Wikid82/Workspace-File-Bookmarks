#!/bin/bash

# Exit immediately if a command exits with a non-zero status
set -e

echo "🔄 Step 1: Checking for dependency changes..."
# Check if package.json has changed compared to git HEAD, or if node_modules doesn't exist
if [ ! -d "node_modules" ] || ! git diff --quiet HEAD -- package.json; then
    echo "📦 package.json changed or node_modules missing. Installing updates..."
    npm install
else
    echo "✅ No dependency updates detected. Skipping install."
fi

echo "🏗️ Step 2: Compiling React view and Extension logic..."
npm run build

echo "📦 Step 3: Packaging extension into VSIX..."
# Clear old vsix files to ensure clean packaging
rm -f *.vsix
npx @vscode/vsce package

# Capture the exact name of the newly generated vsix file
VSIX_FILE=$(ls *.vsix | head -n 1)

if [ -z "$VSIX_FILE" ]; then
    echo "❌ Error: VSIX package generation failed."
    exit 1
fi

echo "💾 Found package: $VSIX_FILE"

echo "🚀 Step 4: Deploying to editors..."

# Install to standard VS Code if available
if command -v code >/dev/null 2>&1; then
    echo "🔵 Installing into VS Code..."
    code --install-extension "$VSIX_FILE"
else
    echo "⚠️  Standard 'code' command not found. Skipping."
fi

# Install to VS Code Insiders if available
if command -v code-insiders >/dev/null 2>&1; then
    echo "🟢 Installing into VS Code Insiders..."
    code-insiders --install-extension "$VSIX_FILE"
else
    echo "⚠️  'code-insiders' command not found. Skipping."
fi

echo "🎉 Done! Restart or reload your VS Code window to see updates."
