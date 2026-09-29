import { describe, it, expect } from 'vitest';
import { activate, deactivate } from '../extension';
import { createFakeContext } from './fakeContext';
import { commands, Position, Selection, Uri, window } from './vscode-mock';

describe('activate', () => {
  it('creates the tree view and registers every command', () => {
    const context = createFakeContext();
    (context as any).subscriptions = [];

    activate(context as any);

    expect(window.createTreeView).toHaveBeenCalledOnce();
    expect(commands.registerCommand).toHaveBeenCalledTimes(23);
    expect((context as any).subscriptions).toHaveLength(24); // tree view + 23 commands
  });

  it('exercises every registered command handler at least once', async () => {
    const context = createFakeContext();
    (context as any).subscriptions = [];

    activate(context as any);

    const calls = commands.registerCommand.mock.calls as unknown as Array<
      [string, (...args: any[]) => unknown]
    >;
    const handlers = new Map(calls);
    const bookmark = {
      id: 'b',
      uri: 'file:///repo/a.ts',
      label: 'a.ts',
      relativePath: 'a.ts',
      workspaceFolderName: 'repo',
      folderId: null,
      createdAt: 0,
    };
    const folder = { id: 'f', name: 'Backend', createdAt: 0 };

    await handlers.get('workspace-file-bookmarks.addBookmark')?.();
    window.activeTextEditor = {
      document: { uri: Uri.file('/repo/a.ts') },
      selection: new Selection(new Position(0, 0), new Position(0, 0)),
    };
    await handlers.get('workspace-file-bookmarks.addBookmarkForSelection')?.();
    window.activeTextEditor = undefined;
    await handlers.get('workspace-file-bookmarks.addBookmarkFromExplorer')?.(undefined, undefined);
    await handlers.get('workspace-file-bookmarks.addBookmarkToFolder')?.(undefined, undefined);
    await handlers.get('workspace-file-bookmarks.removeBookmark')?.({ bookmark });
    await handlers.get('workspace-file-bookmarks.renameBookmark')?.({ bookmark });
    await handlers.get('workspace-file-bookmarks.editTags')?.({ bookmark });
    await handlers.get('workspace-file-bookmarks.filterByTag')?.();
    await handlers.get('workspace-file-bookmarks.clearTagFilter')?.();
    await handlers.get('workspace-file-bookmarks.filterBookmarks')?.();
    await handlers.get('workspace-file-bookmarks.clearSearchFilter')?.();
    await handlers.get('workspace-file-bookmarks.openBookmark')?.(bookmark);
    await handlers.get('workspace-file-bookmarks.createFolder')?.();
    await handlers.get('workspace-file-bookmarks.createSubfolder')?.({ folder });
    await handlers.get('workspace-file-bookmarks.moveFolderToParent')?.({ folder });
    await handlers.get('workspace-file-bookmarks.renameFolder')?.({ folder });
    await handlers.get('workspace-file-bookmarks.deleteFolder')?.({
      folder,
      bookmarks: [],
      childFolders: [],
    });
    await handlers.get('workspace-file-bookmarks.moveToFolder')?.({ bookmark });
    await handlers.get('workspace-file-bookmarks.openAllInFolder')?.({ folder, bookmarks: [] });
    await handlers.get('workspace-file-bookmarks.setViewModeList')?.();
    await handlers.get('workspace-file-bookmarks.setViewModeTree')?.();
    window.showSaveDialog.mockResolvedValue(undefined);
    await handlers.get('workspace-file-bookmarks.exportBookmarks')?.();
    window.showOpenDialog.mockResolvedValue(undefined);
    await handlers.get('workspace-file-bookmarks.importBookmarks')?.();

    expect(handlers.size).toBe(23);
  });
});

describe('deactivate', () => {
  it('is a no-op', () => {
    expect(() => deactivate()).not.toThrow();
  });
});
