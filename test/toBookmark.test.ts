import { describe, it, expect } from 'vitest';
import { toBookmark } from '../extension';
import { Uri, workspace } from './vscode-mock';

describe('toBookmark', () => {
  it('uses the workspace-relative path and folder name inside a workspace folder', () => {
    const uri = Uri.file('/repo/src/a.ts');
    workspace.getWorkspaceFolder.mockReturnValue({ name: 'repo', uri: Uri.file('/repo') });
    workspace.asRelativePath.mockReturnValue('src/a.ts');

    const bookmark = toBookmark(uri as any);

    expect(bookmark.relativePath).toBe('src/a.ts');
    expect(bookmark.workspaceFolderName).toBe('repo');
    expect(bookmark.label).toBe('a.ts');
    expect(bookmark.folderId).toBeNull();
    expect(bookmark.uri).toBe(uri.toString());
  });

  it('falls back to the raw fsPath and "Workspace" when outside any workspace folder', () => {
    const uri = Uri.file('/outside/b.ts');
    workspace.getWorkspaceFolder.mockReturnValue(undefined);

    const bookmark = toBookmark(uri as any);

    expect(bookmark.relativePath).toBe('/outside/b.ts');
    expect(bookmark.workspaceFolderName).toBe('Workspace');
    expect(bookmark.label).toBe('b.ts');
  });

  it('sets lineStart/lineEnd and a line-suffixed label when a single-line selection is given', () => {
    const uri = Uri.file('/repo/src/a.ts');
    workspace.getWorkspaceFolder.mockReturnValue({ name: 'repo', uri: Uri.file('/repo') });
    workspace.asRelativePath.mockReturnValue('src/a.ts');

    const bookmark = toBookmark(uri as any, { lineStart: 12, lineEnd: 12 });

    expect(bookmark.lineStart).toBe(12);
    expect(bookmark.lineEnd).toBe(12);
    expect(bookmark.label).toBe('a.ts:L12');
  });

  it('formats a multi-line selection label as a range', () => {
    const uri = Uri.file('/repo/src/a.ts');
    workspace.getWorkspaceFolder.mockReturnValue({ name: 'repo', uri: Uri.file('/repo') });
    workspace.asRelativePath.mockReturnValue('src/a.ts');

    const bookmark = toBookmark(uri as any, { lineStart: 12, lineEnd: 18 });

    expect(bookmark.label).toBe('a.ts:L12-18');
  });

  it('leaves lineStart/lineEnd unset without a selection', () => {
    const uri = Uri.file('/repo/src/a.ts');
    workspace.getWorkspaceFolder.mockReturnValue({ name: 'repo', uri: Uri.file('/repo') });
    workspace.asRelativePath.mockReturnValue('src/a.ts');

    const bookmark = toBookmark(uri as any);

    expect(bookmark.lineStart).toBeUndefined();
    expect(bookmark.lineEnd).toBeUndefined();
  });
});
