import { describe, it, expect } from 'vitest';
import {
    BOOKMARK_DND_MIME_TYPE,
    BookmarkStore,
    BookmarksTreeProvider,
    BookmarkTreeItem,
    FolderGroupItem,
    computeReorderedIds,
    dropBookmark,
    dropFolder,
    sortByOrder,
    type Bookmark
} from '../extension';
import { createFakeContext } from './fakeContext';
import { DataTransfer, DataTransferItem } from './vscode-mock';

function makeBookmark(overrides: Partial<Bookmark> = {}): Bookmark {
    const id = overrides.id ?? 'id-1';
    return {
        id,
        uri: `file:///repo/src/${id}.ts`,
        label: `${id}.ts`,
        relativePath: `src/${id}.ts`,
        workspaceFolderName: 'repo',
        folderId: null,
        createdAt: 0,
        ...overrides
    };
}

function newStore() {
    return new BookmarkStore(createFakeContext() as any);
}

function newProvider() {
    const context = createFakeContext();
    const store = new BookmarkStore(context as any);
    const provider = new BookmarksTreeProvider(store, context as any);
    return { store, provider };
}

describe('sortByOrder', () => {
    it('sorts by order ascending when every item has one', () => {
        const items = [{ id: 'b', order: 1 }, { id: 'a', order: 0 }];
        expect(sortByOrder(items, () => 0).map(i => i.id)).toEqual(['a', 'b']);
    });

    it('puts ordered items before unordered ones', () => {
        const items = [{ id: 'unordered' }, { id: 'ordered', order: 0 }];
        expect(sortByOrder(items, () => 0).map(i => i.id)).toEqual(['ordered', 'unordered']);
    });

    it('puts ordered items before unordered ones regardless of comparison direction', () => {
        const items = [{ id: 'ordered', order: 0 }, { id: 'unordered' }];
        expect(sortByOrder(items, () => 0).map(i => i.id)).toEqual(['ordered', 'unordered']);
    });

    it('falls back to the comparator when neither item has an order', () => {
        const items: Array<{ id: string; createdAt: number; order?: number }> = [
            { id: 'a', createdAt: 1 },
            { id: 'b', createdAt: 2 }
        ];
        expect(sortByOrder(items, (a, b) => b.createdAt - a.createdAt).map(i => i.id)).toEqual(['b', 'a']);
    });
});

describe('computeReorderedIds', () => {
    it('appends the dragged id at the end when beforeId is null', () => {
        const items = [{ id: 'a', order: 0 }, { id: 'b', order: 1 }];
        expect(computeReorderedIds(items, 'a', null, () => 0)).toEqual(['b', 'a']);
    });

    it('inserts the dragged id before beforeId', () => {
        const items = [{ id: 'a', order: 0 }, { id: 'b', order: 1 }, { id: 'c', order: 2 }];
        expect(computeReorderedIds(items, 'c', 'a', () => 0)).toEqual(['c', 'a', 'b']);
    });
});

describe('dropFolder', () => {
    it('reorders a folder to just before the target folder', () => {
        const store = newStore();
        const a = store.createFolder('A');
        const b = store.createFolder('B');
        const c = store.createFolder('C');

        dropFolder(store, c.id, new FolderGroupItem(a, []));

        const byId = new Map(store.getAllFolders().map(f => [f.id, f]));
        expect(byId.get(c.id)?.order).toBe(0);
        expect(byId.get(a.id)?.order).toBe(1);
        expect(byId.get(b.id)?.order).toBe(2);
    });

    it('moves a folder to the end when dropped on empty space', () => {
        const store = newStore();
        const a = store.createFolder('A');
        const b = store.createFolder('B');

        dropFolder(store, a.id, undefined);

        const byId = new Map(store.getAllFolders().map(f => [f.id, f]));
        expect(byId.get(b.id)?.order).toBe(0);
        expect(byId.get(a.id)?.order).toBe(1);
    });

    it('does nothing when dropped onto itself', () => {
        const store = newStore();
        const a = store.createFolder('A');

        dropFolder(store, a.id, new FolderGroupItem(a, []));

        expect(store.getAllFolders()[0].order).toBeUndefined();
    });

    it('ignores a drop onto a bookmark item', () => {
        const store = newStore();
        const a = store.createFolder('A');
        store.addBookmark(makeBookmark({ id: 'bm' }));

        dropFolder(store, a.id, new BookmarkTreeItem(makeBookmark({ id: 'bm' }), []));

        expect(store.getAllFolders()[0].order).toBeUndefined();
    });
});

describe('dropBookmark', () => {
    it('moves a bookmark into the target folder and appends it', () => {
        const store = newStore();
        const folder = store.createFolder('Backend');
        store.addBookmark(makeBookmark({ id: 'existing', folderId: folder.id }));
        store.addBookmark(makeBookmark({ id: 'dragged', folderId: null }));

        dropBookmark(store, 'dragged', new FolderGroupItem(folder, []), 'tree');

        const byId = new Map(store.getAllBookmarks().map(b => [b.id, b]));
        expect(byId.get('dragged')?.folderId).toBe(folder.id);
        expect(byId.get('existing')?.order).toBe(0);
        expect(byId.get('dragged')?.order).toBe(1);
    });

    it('reorders within the same folder scope in tree view without changing folderId', () => {
        const store = newStore();
        const folder = store.createFolder('Backend');
        store.addBookmark(makeBookmark({ id: 'a', folderId: folder.id }));
        store.addBookmark(makeBookmark({ id: 'b', folderId: folder.id }));

        dropBookmark(store, 'b', new BookmarkTreeItem(makeBookmark({ id: 'a', folderId: folder.id }), []), 'tree');

        const byId = new Map(store.getAllBookmarks().map(bm => [bm.id, bm]));
        expect(byId.get('b')?.folderId).toBe(folder.id);
        expect(byId.get('b')?.order).toBe(0);
        expect(byId.get('a')?.order).toBe(1);
    });

    it('moves folders when dropped onto a bookmark in a different folder in tree view', () => {
        const store = newStore();
        const source = store.createFolder('Source');
        const dest = store.createFolder('Dest');
        store.addBookmark(makeBookmark({ id: 'dragged', folderId: source.id }));
        store.addBookmark(makeBookmark({ id: 'target', folderId: dest.id }));

        dropBookmark(store, 'dragged', new BookmarkTreeItem(makeBookmark({ id: 'target', folderId: dest.id }), []), 'tree');

        const byId = new Map(store.getAllBookmarks().map(bm => [bm.id, bm]));
        expect(byId.get('dragged')?.folderId).toBe(dest.id);
        expect(byId.get('dragged')?.order).toBe(0);
        expect(byId.get('target')?.order).toBe(1);
    });

    it('reorders in place in list view without reassigning folderId', () => {
        const store = newStore();
        const folder = store.createFolder('Backend');
        store.addBookmark(makeBookmark({ id: 'grouped', folderId: folder.id }));
        store.addBookmark(makeBookmark({ id: 'root', folderId: null }));

        dropBookmark(store, 'root', new BookmarkTreeItem(makeBookmark({ id: 'grouped', folderId: folder.id }), []), 'list');

        const byId = new Map(store.getAllBookmarks().map(bm => [bm.id, bm]));
        expect(byId.get('root')?.folderId).toBeNull();
        expect(byId.get('root')?.order).toBe(0);
        expect(byId.get('grouped')?.order).toBe(1);
    });

    it('moves a bookmark to the root and appends it when dropped on empty space in tree view', () => {
        const store = newStore();
        const folder = store.createFolder('Backend');
        store.addBookmark(makeBookmark({ id: 'root-existing', folderId: null }));
        store.addBookmark(makeBookmark({ id: 'dragged', folderId: folder.id }));

        dropBookmark(store, 'dragged', undefined, 'tree');

        const byId = new Map(store.getAllBookmarks().map(bm => [bm.id, bm]));
        expect(byId.get('dragged')?.folderId).toBeNull();
        expect(byId.get('root-existing')?.order).toBe(0);
        expect(byId.get('dragged')?.order).toBe(1);
    });

    it('appends to the end of the flat list when dropped on empty space in list view', () => {
        const store = newStore();
        store.addBookmark(makeBookmark({ id: 'a' }));
        store.addBookmark(makeBookmark({ id: 'dragged' }));

        dropBookmark(store, 'dragged', undefined, 'list');

        const byId = new Map(store.getAllBookmarks().map(bm => [bm.id, bm]));
        expect(byId.get('a')?.order).toBe(0);
        expect(byId.get('dragged')?.order).toBe(1);
    });

    it('does nothing when the dragged bookmark no longer exists', () => {
        const store = newStore();
        store.addBookmark(makeBookmark({ id: 'a' }));

        dropBookmark(store, 'missing', undefined, 'tree');

        expect(store.getAllBookmarks()[0].order).toBeUndefined();
    });

    it('does nothing when dropped onto itself', () => {
        const store = newStore();
        store.addBookmark(makeBookmark({ id: 'a' }));

        dropBookmark(store, 'a', new BookmarkTreeItem(makeBookmark({ id: 'a' }), []), 'tree');

        expect(store.getAllBookmarks()[0].order).toBeUndefined();
    });
});

describe('BookmarksTreeProvider drag and drop', () => {
    it('exposes the same mime type for drag and drop', () => {
        const { provider } = newProvider();
        expect(provider.dragMimeTypes).toEqual([BOOKMARK_DND_MIME_TYPE]);
        expect(provider.dropMimeTypes).toEqual([BOOKMARK_DND_MIME_TYPE]);
    });

    it('handleDrag stores the bookmark id under the mime type', async () => {
        const { provider } = newProvider();
        const item = new BookmarkTreeItem(makeBookmark({ id: 'a' }), []);
        const dataTransfer = new DataTransfer();

        provider.handleDrag([item], dataTransfer as any);

        const stored = await dataTransfer.get(BOOKMARK_DND_MIME_TYPE)?.asString();
        expect(JSON.parse(stored ?? '{}')).toEqual({ kind: 'bookmark', id: 'a' });
    });

    it('handleDrag does nothing when the source list is empty', () => {
        const { provider } = newProvider();
        const dataTransfer = new DataTransfer();

        provider.handleDrag([], dataTransfer as any);

        expect(dataTransfer.get(BOOKMARK_DND_MIME_TYPE)).toBeUndefined();
    });

    it('handleDrop reorders folders end-to-end via the data transfer payload', async () => {
        const { store, provider } = newProvider();
        const a = store.createFolder('A');
        const b = store.createFolder('B');
        const dataTransfer = new DataTransfer();
        dataTransfer.set(BOOKMARK_DND_MIME_TYPE, new DataTransferItem(JSON.stringify({ kind: 'folder', id: b.id })));

        await provider.handleDrop(new FolderGroupItem(a, []), dataTransfer as any);

        const byId = new Map(store.getAllFolders().map(f => [f.id, f]));
        expect(byId.get(b.id)?.order).toBe(0);
        expect(byId.get(a.id)?.order).toBe(1);
    });

    it('handleDrop reorders bookmarks end-to-end via the data transfer payload', async () => {
        const { store, provider } = newProvider();
        store.addBookmark(makeBookmark({ id: 'a' }));
        store.addBookmark(makeBookmark({ id: 'b' }));
        const dataTransfer = new DataTransfer();
        dataTransfer.set(BOOKMARK_DND_MIME_TYPE, new DataTransferItem(JSON.stringify({ kind: 'bookmark', id: 'b' })));

        await provider.handleDrop(new BookmarkTreeItem(makeBookmark({ id: 'a' }), []), dataTransfer as any);

        const byId = new Map(store.getAllBookmarks().map(bm => [bm.id, bm]));
        expect(byId.get('b')?.order).toBe(0);
        expect(byId.get('a')?.order).toBe(1);
    });

    it('handleDrop does nothing when the data transfer has no matching payload', async () => {
        const { store, provider } = newProvider();
        store.addBookmark(makeBookmark({ id: 'a' }));
        const dataTransfer = new DataTransfer();

        await provider.handleDrop(undefined, dataTransfer as any);

        expect(store.getAllBookmarks()[0].order).toBeUndefined();
    });
});
