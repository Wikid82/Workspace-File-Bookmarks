#!/usr/bin/env node
// Computes the next pre-release version by checking what's actually live on the
// VS Code Marketplace and Open VSX, then bumping one patch past the higher of the
// two (falling back to local package.json's version if neither registry has ever
// published this extension yet). See prerelease.yml for why this can't just be
// "local stable minor + 1" -- that collides with release-please.

const { execFileSync } = require('node:child_process');
const pkg = require('../package.json');

function parse(version) {
  const parts = version.split('.').map(Number);
  return parts.length === 3 && parts.every(Number.isFinite) ? parts : null;
}

function higher(a, b) {
  for (let i = 0; i < 3; i++) {
    if (a[i] !== b[i]) return a[i] > b[i] ? a : b;
  }
  return a;
}

function marketplaceMaxVersion() {
  try {
    const out = execFileSync(
      'npx',
      ['--yes', '@vscode/vsce', 'show', `${pkg.publisher}.${pkg.name}`, '--json'],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] },
    );
    const data = JSON.parse(out);
    const versions = (data.versions || []).map((v) => v.version).map(parse).filter(Boolean);
    return versions.reduce(higher, [0, 0, 0]);
  } catch {
    return [0, 0, 0];
  }
}

async function openVsxMaxVersion() {
  try {
    const res = await fetch(`https://open-vsx.org/api/${pkg.publisher}/${pkg.name}`);
    if (!res.ok) return [0, 0, 0];
    const data = await res.json();
    const versions = Object.keys(data.allVersions || {}).map(parse).filter(Boolean);
    return versions.reduce(higher, [0, 0, 0]);
  } catch {
    return [0, 0, 0];
  }
}

async function main() {
  const local = parse(pkg.version) || [0, 0, 0];
  const marketplace = marketplaceMaxVersion();
  const openVsx = await openVsxMaxVersion();

  const max = [local, marketplace, openVsx].reduce(higher);
  const next = [max[0], max[1], max[2] + 1];

  console.error(
    `local=${local.join('.')} marketplace=${marketplace.join('.')} open-vsx=${openVsx.join('.')} -> ${next.join('.')}`,
  );
  console.log(next.join('.'));
}

main();
