import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
    resolve: {
        alias: {
            vscode: path.resolve(import.meta.dirname, 'test/vscode-mock.ts')
        }
    }
});
