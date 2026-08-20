import { describe, it, expect } from 'vitest';
import { BookmarkStore, describeBookmark, type Bookmark } from '../extension';
import { createFakeContext } from './fakeContext';

function makeBookmark(overrides: Partial<Bookmark> = {}): Bookmark {
    return {
        id: 'id-1',
        uri: 'file:///repo/src/a.ts',
        label: 'a.ts',
        relativePath: 'src/a.ts',
        workspaceFolderName: 'repo',
        folderId: null,
        createdAt: 0,
        ...overrides
    };
}

function newStore() {
    // BookmarkStore only touches context.workspaceState; the fake covers that.
    return new BookmarkStore(createFakeContext() as any);
}

describe('BookmarkStore', () => {
    it('starts empty', () => {
        const store = newStore();
        expect(store.getAllBookmarks()).toEqual([]);
        expect(store.getAllFolders()).toEqual([]);
    });

    it('adds a bookmark', () => {
        const store = newStore();
        store.addBookmark(makeBookmark());
        expect(store.getAllBookmarks()).toHaveLength(1);
    });

    it('does not add a duplicate bookmark for the same uri', () => {
        const store = newStore();
        store.addBookmark(makeBookmark({ id: 'a' }));
        store.addBookmark(makeBookmark({ id: 'b' }));
        const all = store.getAllBookmarks();
        expect(all).toHaveLength(1);
        expect(all[0].id).toBe('a');
    });

    it('removes a bookmark by id', () => {
        const store = newStore();
        store.addBookmark(makeBookmark({ id: 'a' }));
        store.removeBookmark('a');
        expect(store.getAllBookmarks()).toEqual([]);
    });

    it('moves a bookmark to a folder', () => {
        const store = newStore();
        store.addBookmark(makeBookmark({ id: 'a', folderId: null }));
        store.moveBookmarkToFolder('a', 'folder-1');
        expect(store.getAllBookmarks()[0].folderId).toBe('folder-1');
    });

    it('creates, renames, and deletes a folder', () => {
        const store = newStore();
        const folder = store.createFolder('Backend');
        expect(store.getAllFolders()).toEqual([folder]);

        store.renameFolder(folder.id, 'API');
        expect(store.getAllFolders()[0].name).toBe('API');

        store.deleteFolder(folder.id);
        expect(store.getAllFolders()).toEqual([]);
    });

    it('unsets folderId on bookmarks when their folder is deleted', () => {
        const store = newStore();
        const folder = store.createFolder('Backend');
        store.addBookmark(makeBookmark({ id: 'a', folderId: folder.id }));

        store.deleteFolder(folder.id);

        expect(store.getAllBookmarks()[0].folderId).toBeNull();
    });

    it('fires onDidChange when bookmarks or folders change', () => {
        const store = newStore();
        let fireCount = 0;
        store.onDidChange(() => fireCount++);

        store.addBookmark(makeBookmark());
        store.createFolder('Backend');

        expect(fireCount).toBe(2);
    });
});

describe('describeBookmark', () => {
    const bookmark = makeBookmark({ workspaceFolderName: 'repo-a', relativePath: 'src/a.ts' });

    it('is just the relative path in a single-root workspace with no folder', () => {
        expect(describeBookmark(bookmark, false, null)).toEqual(['src/a.ts']);
    });

    it('prefixes the workspace folder name in a multi-root workspace', () => {
        expect(describeBookmark(bookmark, true, null)).toEqual(['repo-a', 'src/a.ts']);
    });

    it('prefixes the bookmark folder name when set', () => {
        expect(describeBookmark(bookmark, false, 'Backend')).toEqual(['Backend', 'src/a.ts']);
    });

    it('shows folder name and workspace folder name together', () => {
        expect(describeBookmark(bookmark, true, 'Backend')).toEqual(['Backend', 'repo-a', 'src/a.ts']);
    });
});
