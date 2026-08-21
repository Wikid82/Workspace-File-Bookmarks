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

    it('renames a bookmark label', () => {
        const store = newStore();
        store.addBookmark(makeBookmark({ id: 'a', label: 'a.ts' }));
        store.renameBookmark('a', 'My File');
        expect(store.getAllBookmarks()[0].label).toBe('My File');
    });

    it('sets tags on a bookmark', () => {
        const store = newStore();
        store.addBookmark(makeBookmark({ id: 'a' }));
        store.setBookmarkTags('a', ['auth', 'review']);
        expect(store.getAllBookmarks()[0].tags).toEqual(['auth', 'review']);
    });

    it('collects every distinct tag across bookmarks, sorted alphabetically', () => {
        const store = newStore();
        store.addBookmark(makeBookmark({ id: 'a', uri: 'file:///repo/src/a.ts', tags: ['review', 'auth'] }));
        store.addBookmark(makeBookmark({ id: 'b', uri: 'file:///repo/src/b.ts', tags: ['auth', 'todo'] }));
        store.addBookmark(makeBookmark({ id: 'c', uri: 'file:///repo/src/c.ts' }));

        expect(store.getAllTags()).toEqual(['auth', 'review', 'todo']);
    });

    it('assigns sequential order to the named bookmarks and leaves others untouched', () => {
        const store = newStore();
        store.addBookmark(makeBookmark({ id: 'a', uri: 'file:///repo/src/a.ts' }));
        store.addBookmark(makeBookmark({ id: 'b', uri: 'file:///repo/src/b.ts' }));
        store.addBookmark(makeBookmark({ id: 'c', uri: 'file:///repo/src/c.ts' }));

        store.reorderBookmarks(['c', 'a']);

        const byId = new Map(store.getAllBookmarks().map(b => [b.id, b]));
        expect(byId.get('c')?.order).toBe(0);
        expect(byId.get('a')?.order).toBe(1);
        expect(byId.get('b')?.order).toBeUndefined();
    });

    it('assigns sequential order to the named folders and leaves others untouched', () => {
        const store = newStore();
        const first = store.createFolder('First');
        const second = store.createFolder('Second');

        store.reorderFolders([second.id, first.id]);

        const byId = new Map(store.getAllFolders().map(f => [f.id, f]));
        expect(byId.get(second.id)?.order).toBe(0);
        expect(byId.get(first.id)?.order).toBe(1);
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

    it('appends hashtag-prefixed tags when present', () => {
        const tagged = makeBookmark({ workspaceFolderName: 'repo-a', relativePath: 'src/a.ts', tags: ['auth', 'review'] });
        expect(describeBookmark(tagged, false, null)).toEqual(['src/a.ts', '#auth #review']);
    });

    it('omits the tags segment when tags is an empty array', () => {
        const tagged = makeBookmark({ workspaceFolderName: 'repo-a', relativePath: 'src/a.ts', tags: [] });
        expect(describeBookmark(tagged, false, null)).toEqual(['src/a.ts']);
    });
});
