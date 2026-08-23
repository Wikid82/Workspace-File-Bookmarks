import { defineConfig } from '@vscode/test-cli';

export default defineConfig({
  files: 'out-e2e/**/*.test.js',
  workspaceFolder: 'test/e2e/fixtures/workspace',
  mocha: {
    ui: 'bdd',
    timeout: 20000,
  },
});
