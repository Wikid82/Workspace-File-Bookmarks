import { describe, it, expect } from 'vitest';
import { activate, deactivate } from '../extension';
import { createFakeContext } from './fakeContext';
import { commands, window } from './vscode-mock';

describe('activate', () => {
    it('creates the tree view and registers every command', () => {
        const context = createFakeContext();
        (context as any).subscriptions = [];

        activate(context as any);

        expect(window.createTreeView).toHaveBeenCalledOnce();
        expect(commands.registerCommand).toHaveBeenCalledTimes(18);
        expect((context as any).subscriptions).toHaveLength(19); // tree view + 18 commands
    });

    it('exercises every registered command handler at least once', async () => {
        const context = createFakeContext();
        (context as any).subscriptions = [];

        activate(context as any);

        const calls = commands.registerCommand.mock.calls as unknown as Array<[string, (...args: any[]) => unknown]>;
        const handlers = new Map(calls);
        const bookmark = { id: 'b', uri: 'file:///repo/a.ts', label: 'a.ts', relativePath: 'a.ts', workspaceFolderName: 'repo', folderId: null, createdAt: 0 };
        const folder = { id: 'f', name: 'Backend', createdAt: 0 };

        await handlers.get('workspace-file-bookmarks.addBookmark')?.();
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
        await handlers.get('workspace-file-bookmarks.renameFolder')?.({ folder });
        await handlers.get('workspace-file-bookmarks.deleteFolder')?.({ folder, bookmarks: [] });
        await handlers.get('workspace-file-bookmarks.moveToFolder')?.({ bookmark });
        await handlers.get('workspace-file-bookmarks.openAllInFolder')?.({ folder, bookmarks: [] });
        await handlers.get('workspace-file-bookmarks.setViewModeList')?.();
        await handlers.get('workspace-file-bookmarks.setViewModeTree')?.();

        expect(handlers.size).toBe(18);
    });
});

describe('deactivate', () => {
    it('is a no-op', () => {
        expect(() => deactivate()).not.toThrow();
    });
});
