import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  resolve: {
    alias: {
      vscode: path.resolve(import.meta.dirname, 'test/vscode-mock.ts'),
    },
  },
  test: {
    exclude: ['**/node_modules/**', 'test/e2e/**', 'out-e2e/**', '.vscode-test/**'],
    setupFiles: ['./test/setup.ts'],
    clearMocks: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['extension.ts'],
      thresholds: {
        lines: 85,
        statements: 85,
        functions: 85,
        branches: 85,
      },
    },
  },
});
