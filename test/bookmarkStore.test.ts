import { describe, it, expect } from 'vitest';
import {
    BookmarkStore,
    MAX_FOLDER_DEPTH,
    canNestUnder,
    describeBookmark,
    eligibleParentFolders,
    folderBreadcrumb,
    folderSubtreeHeight,
    isDescendantFolder,
    matchesSearchFilter,
    type Bookmark,
    type BookmarkFolder
} from '../extension';
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

    it('creates a folder with a parent when given one', () => {
        const store = newStore();
        const parent = store.createFolder('Backend');
        const child = store.createFolder('Auth Service', parent.id);
        expect(child.parentId).toBe(parent.id);
    });

    it('defaults a folder to root (parentId null) when no parent is given', () => {
        const store = newStore();
        const folder = store.createFolder('Backend');
        expect(folder.parentId).toBeNull();
    });

    it('moves a folder to a new parent', () => {
        const store = newStore();
        const a = store.createFolder('A');
        const b = store.createFolder('B');

        store.moveFolderToParent(b.id, a.id);

        expect(store.getAllFolders().find(f => f.id === b.id)?.parentId).toBe(a.id);
    });

    it('promotes child folders to root when their parent is deleted', () => {
        const store = newStore();
        const parent = store.createFolder('Backend');
        const child = store.createFolder('Auth Service', parent.id);

        store.deleteFolder(parent.id);

        expect(store.getAllFolders().find(f => f.id === child.id)?.parentId).toBeNull();
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

describe('matchesSearchFilter', () => {
    const bookmark = makeBookmark({ label: 'auth-service.ts', relativePath: 'src/auth/service.ts', workspaceFolderName: 'backend-repo' });

    it('matches (case-insensitively) against the label', () => {
        expect(matchesSearchFilter(bookmark, 'AUTH-SERVICE')).toBe(true);
    });

    it('matches against the relative path', () => {
        expect(matchesSearchFilter(bookmark, 'src/auth')).toBe(true);
    });

    it('matches against the workspace folder name', () => {
        expect(matchesSearchFilter(bookmark, 'backend')).toBe(true);
    });

    it('returns false when nothing matches', () => {
        expect(matchesSearchFilter(bookmark, 'frontend')).toBe(false);
    });

    it('treats a blank query as matching everything', () => {
        expect(matchesSearchFilter(bookmark, '   ')).toBe(true);
    });
});

function makeFolder(id: string, name: string, parentId: string | null = null): BookmarkFolder {
    return { id, name, createdAt: 0, parentId };
}

describe('folderSubtreeHeight', () => {
    it('is 0 for a folder with no children', () => {
        const folders = [makeFolder('a', 'A')];
        expect(folderSubtreeHeight(folders, 'a')).toBe(0);
    });

    it('is the depth of the deepest descendant chain', () => {
        const folders = [makeFolder('a', 'A'), makeFolder('b', 'B', 'a'), makeFolder('c', 'C', 'b')];
        expect(folderSubtreeHeight(folders, 'a')).toBe(2);
    });
});

describe('isDescendantFolder', () => {
    const folders = [makeFolder('a', 'A'), makeFolder('b', 'B', 'a'), makeFolder('c', 'C', 'b'), makeFolder('sibling', 'Sibling')];

    it('is true for the folder itself', () => {
        expect(isDescendantFolder(folders, 'a', 'a')).toBe(true);
    });

    it('is true for a direct child', () => {
        expect(isDescendantFolder(folders, 'a', 'b')).toBe(true);
    });

    it('is true for a deeper descendant', () => {
        expect(isDescendantFolder(folders, 'a', 'c')).toBe(true);
    });

    it('is false for an unrelated folder', () => {
        expect(isDescendantFolder(folders, 'a', 'sibling')).toBe(false);
    });
});

describe('canNestUnder', () => {
    it('allows nesting at the root', () => {
        expect(canNestUnder([], null)).toBe(true);
    });

    it('allows nesting up to MAX_FOLDER_DEPTH', () => {
        const folders = [makeFolder('l1', 'L1'), makeFolder('l2', 'L2', 'l1')];
        expect(canNestUnder(folders, 'l2')).toBe(true);
    });

    it('refuses nesting that would exceed MAX_FOLDER_DEPTH', () => {
        const folders = [makeFolder('l1', 'L1'), makeFolder('l2', 'L2', 'l1'), makeFolder('l3', 'L3', 'l2')];
        expect(canNestUnder(folders, 'l3')).toBe(false);
    });

    it('accounts for the height of a subtree being moved', () => {
        const folders = [makeFolder('l1', 'L1'), makeFolder('l2', 'L2', 'l1')];
        // l2 has no children (height 0) so nesting under l1 (depth 1) is fine...
        expect(canNestUnder(folders, 'l1', 0)).toBe(true);
        // ...but nesting a subtree of height 1 under l2 (depth 2) would reach depth 4.
        expect(canNestUnder(folders, 'l2', 1)).toBe(false);
    });

    it('confirms MAX_FOLDER_DEPTH is 3', () => {
        expect(MAX_FOLDER_DEPTH).toBe(3);
    });
});

describe('eligibleParentFolders', () => {
    it('excludes folders that are already at max depth', () => {
        const store = newStore();
        const l1 = store.createFolder('L1');
        const l2 = store.createFolder('L2', l1.id);
        store.createFolder('L3', l2.id);

        const eligible = eligibleParentFolders(store);

        expect(eligible.map(f => f.id)).toEqual([l1.id, l2.id]);
    });

    it('excludes the folder itself and its descendants when reparenting', () => {
        const store = newStore();
        const a = store.createFolder('A');
        store.createFolder('B', a.id);
        const sibling = store.createFolder('Sibling');

        const eligible = eligibleParentFolders(store, { excludeFolderId: a.id });

        expect(eligible.map(f => f.id)).toEqual([sibling.id]);
    });
});

describe('folderBreadcrumb', () => {
    it('is just the name for a root-level folder', () => {
        const folders = [makeFolder('a', 'Backend')];
        expect(folderBreadcrumb(folders, 'a')).toBe('Backend');
    });

    it('joins ancestors with a chevron for a nested folder', () => {
        const folders = [makeFolder('a', 'Backend'), makeFolder('b', 'Auth Service', 'a')];
        expect(folderBreadcrumb(folders, 'b')).toBe('Backend › Auth Service');
    });

    it('stops cleanly at a dangling (missing) folder id', () => {
        expect(folderBreadcrumb([], 'missing')).toBe('');
    });
});
