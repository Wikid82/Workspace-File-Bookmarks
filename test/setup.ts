import { afterEach, vi } from 'vitest';
import { window, workspace } from './vscode-mock';

afterEach(() => {
  vi.clearAllMocks();
  window.activeTextEditor = undefined;
  workspace.workspaceFolders = undefined;
});
