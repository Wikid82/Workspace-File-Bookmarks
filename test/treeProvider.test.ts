import { describe, it, expect } from 'vitest';
import { BookmarkStore, BookmarksTreeProvider, FolderGroupItem, BookmarkTreeItem, type Bookmark } from '../extension';
import { createFakeContext } from './fakeContext';
import { commands, workspace, Uri } from './vscode-mock';

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

function newProvider() {
    const context = createFakeContext();
    const store = new BookmarkStore(context as any);
    const provider = new BookmarksTreeProvider(store, context as any);
    return { store, provider };
}

describe('BookmarksTreeProvider', () => {
    it('defaults to tree view mode', () => {
        const { provider } = newProvider();
        expect(provider.getViewMode()).toBe('tree');
    });

    it('switches view mode and persists it', () => {
        const { provider } = newProvider();
        provider.setViewMode('list');
        expect(provider.getViewMode()).toBe('list');
    });

    it('getTreeItem returns the element unchanged', () => {
        const { provider } = newProvider();
        const item = new BookmarkTreeItem(makeBookmark(), ['src/a.ts']);
        expect(provider.getTreeItem(item)).toBe(item);
    });

    describe('tag filter', () => {
        it('defaults to no filter', () => {
            const { provider } = newProvider();
            expect(provider.getTagFilter()).toBeNull();
        });

        it('sets and reports the active tag filter, updating the context key', () => {
            const { provider } = newProvider();
            provider.setTagFilter('auth');
            expect(provider.getTagFilter()).toBe('auth');
            expect(commands.executeCommand).toHaveBeenCalledWith('setContext', 'workspace-file-bookmarks.tagFilterActive', true);
        });

        it('clears the filter and updates the context key', () => {
            const { provider } = newProvider();
            provider.setTagFilter('auth');
            provider.setTagFilter(null);
            expect(provider.getTagFilter()).toBeNull();
            expect(commands.executeCommand).toHaveBeenCalledWith('setContext', 'workspace-file-bookmarks.tagFilterActive', false);
        });

        it('narrows list mode to bookmarks carrying the active tag', () => {
            const { store, provider } = newProvider();
            provider.setViewMode('list');
            store.addBookmark(makeBookmark({ id: 'tagged', tags: ['auth'] }));
            store.addBookmark(makeBookmark({ id: 'untagged' }));

            provider.setTagFilter('auth');
            const children = provider.getChildren() as BookmarkTreeItem[];

            expect(children.map(c => c.bookmark.id)).toEqual(['tagged']);
        });

        it('narrows tree mode, including bookmarks nested in folders', () => {
            const { store, provider } = newProvider();
            const folder = store.createFolder('Backend');
            store.addBookmark(makeBookmark({ id: 'tagged', folderId: folder.id, tags: ['auth'] }));
            store.addBookmark(makeBookmark({ id: 'untagged', folderId: folder.id }));

            provider.setTagFilter('auth');
            const [folderNode] = provider.getChildren();
            const children = provider.getChildren(folderNode) as BookmarkTreeItem[];

            expect(children.map(c => c.bookmark.id)).toEqual(['tagged']);
        });
    });

    describe('list mode', () => {
        it('returns all bookmarks newest-first, ignoring folders', () => {
            const { store, provider } = newProvider();
            provider.setViewMode('list');
            store.createFolder('Backend');
            store.addBookmark(makeBookmark({ id: 'old', createdAt: 1 }));
            store.addBookmark(makeBookmark({ id: 'new', createdAt: 2 }));

            const children = provider.getChildren() as BookmarkTreeItem[];

            expect(children.map(c => c.bookmark.id)).toEqual(['new', 'old']);
        });

        it('returns no children for any element (flat list)', () => {
            const { provider } = newProvider();
            provider.setViewMode('list');
            const item = new BookmarkTreeItem(makeBookmark(), []);

            expect(provider.getChildren(item)).toEqual([]);
        });
    });

    describe('tree mode', () => {
        it('groups bookmarks under their folder, alphabetized, and lists ungrouped ones after', () => {
            const { store, provider } = newProvider();
            const zFolder = store.createFolder('Zeta');
            const aFolder = store.createFolder('Alpha');
            store.addBookmark(makeBookmark({ id: 'grouped', folderId: aFolder.id }));
            store.addBookmark(makeBookmark({ id: 'ungrouped-old', folderId: null, createdAt: 1 }));
            store.addBookmark(makeBookmark({ id: 'ungrouped-new', folderId: null, createdAt: 2 }));

            const children = provider.getChildren();

            expect(children.filter((c): c is FolderGroupItem => c instanceof FolderGroupItem).map(f => f.folder.name)).toEqual([
                'Alpha',
                'Zeta'
            ]);
            expect(children.filter((c): c is BookmarkTreeItem => c instanceof BookmarkTreeItem).map(b => b.bookmark.id)).toEqual([
                'ungrouped-new',
                'ungrouped-old'
            ]);
            void zFolder;
        });

        it('returns the bookmarks inside a folder, newest first, when expanded', () => {
            const { store, provider } = newProvider();
            const folder = store.createFolder('Backend');
            store.addBookmark(makeBookmark({ id: 'old', folderId: folder.id, createdAt: 1 }));
            store.addBookmark(makeBookmark({ id: 'new', folderId: folder.id, createdAt: 2 }));

            const [folderNode] = provider.getChildren();
            const children = provider.getChildren(folderNode) as BookmarkTreeItem[];

            expect(children.map(c => c.bookmark.id)).toEqual(['new', 'old']);
        });

        it('returns no children for a leaf bookmark node', () => {
            const { store, provider } = newProvider();
            store.addBookmark(makeBookmark());
            const [bookmarkNode] = provider.getChildren();

            expect(provider.getChildren(bookmarkNode)).toEqual([]);
        });

        it('includes the workspace folder name in a multi-root workspace', () => {
            const { store, provider } = newProvider();
            workspace.workspaceFolders = [
                { name: 'repo-a', uri: Uri.file('/repo-a') },
                { name: 'repo-b', uri: Uri.file('/repo-b') }
            ];
            store.addBookmark(makeBookmark());

            const [bookmarkNode] = provider.getChildren() as BookmarkTreeItem[];

            expect(bookmarkNode.description).toContain('repo');
        });
    });
});
