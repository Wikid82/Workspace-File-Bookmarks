import { describe, it, expect, vi } from 'vitest';
import {
    BookmarkStore,
    addActiveFileBookmark,
    addBookmarksForUris,
    addBookmarksToFolder,
    createFolder,
    createSubfolder,
    deleteFolder,
    editBookmarkTags,
    filterBookmarks,
    filterByTag,
    moveFolderToParent,
    moveToFolder,
    openAllInFolder,
    openBookmark,
    pickFolder,
    pickParentFolder,
    renameBookmark,
    renameFolder,
    type Bookmark,
    type BookmarkFolder
} from '../extension';
import { createFakeContext } from './fakeContext';
import { Uri, window, workspace } from './vscode-mock';
import type { InputBox } from './vscode-mock';

function newStore() {
    return new BookmarkStore(createFakeContext() as any);
}

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

function makeFolder(overrides: Partial<BookmarkFolder> = {}): BookmarkFolder {
    return { id: 'folder-1', name: 'Backend', createdAt: 0, ...overrides };
}

describe('addActiveFileBookmark', () => {
    it('bookmarks the active editor document', () => {
        const store = newStore();
        workspace.getWorkspaceFolder.mockReturnValue(undefined);
        window.activeTextEditor = { document: { uri: Uri.file('/repo/a.ts') } };

        addActiveFileBookmark(store);

        expect(store.getAllBookmarks()).toHaveLength(1);
    });

    it('warns and does nothing when no file is open', () => {
        const store = newStore();
        window.activeTextEditor = undefined;

        addActiveFileBookmark(store);

        expect(window.showWarningMessage).toHaveBeenCalledOnce();
        expect(store.getAllBookmarks()).toHaveLength(0);
    });
});

describe('addBookmarksForUris', () => {
    it('bookmarks every uri in a multi-select', () => {
        const store = newStore();
        workspace.getWorkspaceFolder.mockReturnValue(undefined);

        addBookmarksForUris(store, undefined, [Uri.file('/repo/a.ts') as any, Uri.file('/repo/b.ts') as any]);

        expect(store.getAllBookmarks()).toHaveLength(2);
    });

    it('falls back to the single uri when uris is empty', () => {
        const store = newStore();
        workspace.getWorkspaceFolder.mockReturnValue(undefined);

        addBookmarksForUris(store, Uri.file('/repo/a.ts') as any, undefined);

        expect(store.getAllBookmarks()).toHaveLength(1);
    });

    it('does nothing when neither uri nor uris is provided', () => {
        const store = newStore();

        addBookmarksForUris(store, undefined, undefined);

        expect(store.getAllBookmarks()).toHaveLength(0);
    });
});

describe('openBookmark', () => {
    it('opens the document in a non-preview editor', async () => {
        const document = {};
        workspace.openTextDocument.mockResolvedValue(document);

        await openBookmark(makeBookmark());

        expect(workspace.openTextDocument).toHaveBeenCalled();
        expect(window.showTextDocument).toHaveBeenCalledWith(document, { preview: false });
    });

    it('shows an error when the file cannot be opened', async () => {
        workspace.openTextDocument.mockRejectedValue(new Error('not found'));

        await openBookmark(makeBookmark());

        expect(window.showErrorMessage).toHaveBeenCalledOnce();
    });
});

describe('openAllInFolder', () => {
    it('opens every bookmark in the folder', async () => {
        const document = {};
        workspace.openTextDocument.mockResolvedValue(document);
        const item = { folder: makeFolder(), bookmarks: [makeBookmark({ id: 'a' }), makeBookmark({ id: 'b' })] };

        await openAllInFolder(newStore(), item as any);

        expect(workspace.openTextDocument).toHaveBeenCalledTimes(2);
    });

    it('shows an info message instead of opening when the folder is empty', async () => {
        const item = { folder: makeFolder(), bookmarks: [] };

        await openAllInFolder(newStore(), item as any);

        expect(window.showInformationMessage).toHaveBeenCalledOnce();
        expect(workspace.openTextDocument).not.toHaveBeenCalled();
    });
});

describe('createFolder', () => {
    it('creates a folder from trimmed input', async () => {
        const store = newStore();
        window.showInputBox.mockResolvedValue('  Backend  ');

        await createFolder(store);

        expect(store.getAllFolders()).toHaveLength(1);
        expect(store.getAllFolders()[0].name).toBe('Backend');

        const validateInput = window.showInputBox.mock.calls[0][0].validateInput;
        expect(validateInput('   ')).toMatch(/cannot be empty/);
        expect(validateInput('Backend')).toBeUndefined();
    });

    it('does nothing when the input is cancelled', async () => {
        const store = newStore();
        window.showInputBox.mockResolvedValue(undefined);

        await createFolder(store);

        expect(store.getAllFolders()).toHaveLength(0);
    });
});

describe('renameFolder', () => {
    it('renames the folder from trimmed input', async () => {
        const store = newStore();
        const folder = store.createFolder('Backend');
        window.showInputBox.mockResolvedValue('  API  ');

        await renameFolder(store, { folder } as any);

        expect(store.getAllFolders()[0].name).toBe('API');

        const validateInput = window.showInputBox.mock.calls[0][0].validateInput;
        expect(validateInput('   ')).toMatch(/cannot be empty/);
        expect(validateInput('API')).toBeUndefined();
    });

    it('does nothing when the input is cancelled', async () => {
        const store = newStore();
        const folder = store.createFolder('Backend');
        window.showInputBox.mockResolvedValue(undefined);

        await renameFolder(store, { folder } as any);

        expect(store.getAllFolders()[0].name).toBe('Backend');
    });
});

describe('renameBookmark', () => {
    it('renames the bookmark from trimmed input', async () => {
        const store = newStore();
        const bookmark = makeBookmark();
        store.addBookmark(bookmark);
        window.showInputBox.mockResolvedValue('  My Bookmark  ');

        await renameBookmark(store, { bookmark } as any);

        expect(store.getAllBookmarks()[0].label).toBe('My Bookmark');

        const validateInput = window.showInputBox.mock.calls[0][0].validateInput;
        expect(validateInput('   ')).toMatch(/cannot be empty/);
        expect(validateInput('My Bookmark')).toBeUndefined();
    });

    it('does nothing when the input is cancelled', async () => {
        const store = newStore();
        const bookmark = makeBookmark();
        store.addBookmark(bookmark);
        window.showInputBox.mockResolvedValue(undefined);

        await renameBookmark(store, { bookmark } as any);

        expect(store.getAllBookmarks()[0].label).toBe('a.ts');
    });
});

describe('editBookmarkTags', () => {
    it('sets tags from the picked items, pre-checking the bookmark\'s current tags', async () => {
        const store = newStore();
        const bookmark = makeBookmark({ tags: ['auth'] });
        store.addBookmark(bookmark);
        store.addBookmark(makeBookmark({ id: 'other', uri: 'file:///repo/src/other.ts', tags: ['review'] }));
        window.showQuickPick.mockResolvedValue([{ label: 'auth', picked: true }, { label: 'review' }]);

        await editBookmarkTags(store, { bookmark } as any);

        expect(store.getAllBookmarks().find(b => b.id === bookmark.id)?.tags).toEqual(['auth', 'review']);
        const items = window.showQuickPick.mock.calls[0][0];
        expect(items).toEqual([
            { label: 'auth', picked: true },
            { label: 'review', picked: false },
            { label: '$(add) Add New Tag...' }
        ]);
        expect(window.showQuickPick.mock.calls[0][1]).toMatchObject({ canPickMany: true });
    });

    it('does nothing when the quick-pick is cancelled', async () => {
        const store = newStore();
        const bookmark = makeBookmark({ tags: ['auth'] });
        store.addBookmark(bookmark);
        window.showQuickPick.mockResolvedValue(undefined);

        await editBookmarkTags(store, { bookmark } as any);

        expect(store.getAllBookmarks()[0].tags).toEqual(['auth']);
    });

    it('prompts for and adds a new tag when "Add New Tag..." is picked', async () => {
        const store = newStore();
        const bookmark = makeBookmark({ tags: [] });
        store.addBookmark(bookmark);
        window.showQuickPick.mockResolvedValue([{ label: '$(add) Add New Tag...' }]);
        window.showInputBox.mockResolvedValue('  urgent  ');

        await editBookmarkTags(store, { bookmark } as any);

        expect(store.getAllBookmarks()[0].tags).toEqual(['urgent']);
        const validateInput = window.showInputBox.mock.calls[0][0].validateInput;
        expect(validateInput('   ')).toMatch(/cannot be empty/);
        expect(validateInput('urgent')).toBeUndefined();
    });

    it('drops "Add New Tag..." from the result when its input box is cancelled', async () => {
        const store = newStore();
        const bookmark = makeBookmark({ tags: [] });
        store.addBookmark(bookmark);
        window.showQuickPick.mockResolvedValue([{ label: 'auth' }, { label: '$(add) Add New Tag...' }]);
        window.showInputBox.mockResolvedValue(undefined);

        await editBookmarkTags(store, { bookmark } as any);

        expect(store.getAllBookmarks()[0].tags).toEqual(['auth']);
    });

    it('deduplicates tags picked more than once', async () => {
        const store = newStore();
        const bookmark = makeBookmark({ tags: ['auth'] });
        store.addBookmark(bookmark);
        window.showQuickPick.mockResolvedValue([{ label: 'auth' }, { label: '$(add) Add New Tag...' }]);
        window.showInputBox.mockResolvedValue('auth');

        await editBookmarkTags(store, { bookmark } as any);

        expect(store.getAllBookmarks()[0].tags).toEqual(['auth']);
    });
});

describe('filterByTag', () => {
    function fakeProvider(overrides: { tagFilter?: string | null } = {}) {
        return {
            tagFilter: overrides.tagFilter ?? null,
            getTagFilter(this: { tagFilter: string | null }) {
                return this.tagFilter;
            },
            setTagFilter: vi.fn()
        };
    }

    it('shows an info message and skips the quick-pick when there are no tags yet', async () => {
        const store = newStore();
        const provider = fakeProvider();

        await filterByTag(store, provider as any);

        expect(window.showInformationMessage).toHaveBeenCalledOnce();
        expect(window.showQuickPick).not.toHaveBeenCalled();
        expect(provider.setTagFilter).not.toHaveBeenCalled();
    });

    it('sets the tag filter to the picked tag', async () => {
        const store = newStore();
        store.addBookmark(makeBookmark({ tags: ['auth'] }));
        const provider = fakeProvider();
        window.showQuickPick.mockResolvedValue('auth');

        await filterByTag(store, provider as any);

        expect(provider.setTagFilter).toHaveBeenCalledWith('auth');
        expect(window.showQuickPick.mock.calls[0][0]).toEqual(['auth']);
    });

    it('offers a "Clear Filter" pick when a filter is already active', async () => {
        const store = newStore();
        store.addBookmark(makeBookmark({ tags: ['auth'] }));
        const provider = fakeProvider({ tagFilter: 'auth' });
        window.showQuickPick.mockResolvedValue('$(clear-all) Clear Filter');

        await filterByTag(store, provider as any);

        expect(window.showQuickPick.mock.calls[0][0]).toEqual(['$(clear-all) Clear Filter', 'auth']);
        expect(provider.setTagFilter).toHaveBeenCalledWith(null);
    });

    it('does nothing when the quick-pick is cancelled', async () => {
        const store = newStore();
        store.addBookmark(makeBookmark({ tags: ['auth'] }));
        const provider = fakeProvider();
        window.showQuickPick.mockResolvedValue(undefined);

        await filterByTag(store, provider as any);

        expect(provider.setTagFilter).not.toHaveBeenCalled();
    });
});

describe('filterBookmarks', () => {
    function fakeProvider(overrides: { searchFilter?: string | null } = {}) {
        return {
            searchFilter: overrides.searchFilter ?? null,
            getSearchFilter(this: { searchFilter: string | null }) {
                return this.searchFilter;
            },
            setSearchFilter: vi.fn()
        };
    }

    it('opens the input box pre-filled with the current filter', () => {
        const provider = fakeProvider({ searchFilter: 'auth' });

        const inputBox = filterBookmarks(provider as any) as unknown as InputBox;

        expect(inputBox.value).toBe('auth');
        expect(inputBox.visible).toBe(true);
    });

    it('updates the filter live as the value changes', () => {
        const provider = fakeProvider();

        const inputBox = filterBookmarks(provider as any) as unknown as InputBox;
        inputBox.triggerChangeValue('auth');

        expect(provider.setSearchFilter).toHaveBeenCalledWith('auth');
    });

    it('keeps the filter and closes on accept', () => {
        const provider = fakeProvider();

        const inputBox = filterBookmarks(provider as any) as unknown as InputBox;
        inputBox.triggerChangeValue('auth');
        inputBox.triggerAccept();

        expect(inputBox.visible).toBe(false);
        expect(inputBox.disposed).toBe(true);
        expect(provider.setSearchFilter).toHaveBeenCalledWith('auth');
        expect(provider.setSearchFilter).not.toHaveBeenCalledWith(null);
    });

    it('clears the filter when hidden without accepting', () => {
        const provider = fakeProvider();

        const inputBox = filterBookmarks(provider as any) as unknown as InputBox;
        inputBox.triggerChangeValue('auth');
        inputBox.hide();

        expect(inputBox.disposed).toBe(true);
        expect(provider.setSearchFilter).toHaveBeenCalledWith(null);
    });
});

describe('deleteFolder', () => {
    it('deletes an empty folder without confirming', async () => {
        const store = newStore();
        const folder = store.createFolder('Backend');

        await deleteFolder(store, { folder, bookmarks: [], childFolders: [] } as any);

        expect(store.getAllFolders()).toHaveLength(0);
        expect(window.showWarningMessage).not.toHaveBeenCalled();
    });

    it('deletes a non-empty folder only after confirmation', async () => {
        const store = newStore();
        const folder = store.createFolder('Backend');
        window.showWarningMessage.mockResolvedValue('Delete');

        await deleteFolder(store, { folder, bookmarks: [makeBookmark()], childFolders: [] } as any);

        expect(store.getAllFolders()).toHaveLength(0);
    });

    it('keeps a non-empty folder when the confirmation is declined', async () => {
        const store = newStore();
        const folder = store.createFolder('Backend');
        window.showWarningMessage.mockResolvedValue(undefined);

        await deleteFolder(store, { folder, bookmarks: [makeBookmark()], childFolders: [] } as any);

        expect(store.getAllFolders()).toHaveLength(1);
    });

    it('confirms and mentions subfolders when the folder has children but no bookmarks', async () => {
        const store = newStore();
        const folder = store.createFolder('Backend');
        const child = store.createFolder('Auth Service', folder.id);
        window.showWarningMessage.mockResolvedValue('Delete');

        await deleteFolder(store, { folder, bookmarks: [], childFolders: [child] } as any);

        expect(window.showWarningMessage.mock.calls[0][0]).toMatch(/1 subfolder\(s\) will move to the root/);
        expect(store.getAllFolders().find(f => f.id === folder.id)).toBeUndefined();
    });

    it('mentions both bookmarks and subfolders when a folder has both', async () => {
        const store = newStore();
        const folder = store.createFolder('Backend');
        const child = store.createFolder('Auth Service', folder.id);
        window.showWarningMessage.mockResolvedValue('Delete');

        await deleteFolder(store, { folder, bookmarks: [makeBookmark()], childFolders: [child] } as any);

        expect(window.showWarningMessage.mock.calls[0][0]).toMatch(/bookmark\(s\).*and.*subfolder\(s\)/);
    });
});

describe('pickFolder', () => {
    it('returns null for the root/no-folder pick', async () => {
        const store = newStore();
        window.showQuickPick.mockResolvedValue('$(circle-slash) No Folder (root)');

        await expect(pickFolder(store, 'placeholder')).resolves.toBeNull();
    });

    it('returns undefined when the quick pick is cancelled', async () => {
        const store = newStore();
        window.showQuickPick.mockResolvedValue(undefined);

        await expect(pickFolder(store, 'placeholder')).resolves.toBeUndefined();
    });

    it('returns the matching folder id for an existing folder', async () => {
        const store = newStore();
        const folder = store.createFolder('Backend');
        window.showQuickPick.mockResolvedValue('Backend');

        await expect(pickFolder(store, 'placeholder')).resolves.toBe(folder.id);
    });

    it('creates a new folder and returns its id', async () => {
        const store = newStore();
        window.showQuickPick.mockResolvedValue('$(new-folder) New Folder...');
        window.showInputBox.mockResolvedValue('Frontend');

        const id = await pickFolder(store, 'placeholder');

        expect(store.getAllFolders().find(f => f.id === id)?.name).toBe('Frontend');

        const validateInput = window.showInputBox.mock.calls[0][0].validateInput;
        expect(validateInput('   ')).toMatch(/cannot be empty/);
        expect(validateInput('Frontend')).toBeUndefined();
    });

    it('returns undefined when creating a new folder is cancelled', async () => {
        const store = newStore();
        window.showQuickPick.mockResolvedValue('$(new-folder) New Folder...');
        window.showInputBox.mockResolvedValue(undefined);

        await expect(pickFolder(store, 'placeholder')).resolves.toBeUndefined();
    });
});

describe('pickParentFolder', () => {
    it('returns null for the root/no-parent pick', async () => {
        const store = newStore();
        window.showQuickPick.mockResolvedValue('$(circle-slash) No Parent (root)');

        await expect(pickParentFolder(store, 'placeholder')).resolves.toBeNull();
    });

    it('returns undefined when the quick pick is cancelled', async () => {
        const store = newStore();
        window.showQuickPick.mockResolvedValue(undefined);

        await expect(pickParentFolder(store, 'placeholder')).resolves.toBeUndefined();
    });

    it('returns the matching folder id, using breadcrumb labels', async () => {
        const store = newStore();
        const parent = store.createFolder('Backend');
        const child = store.createFolder('Auth Service', parent.id);
        window.showQuickPick.mockResolvedValue('Backend › Auth Service');

        await expect(pickParentFolder(store, 'placeholder')).resolves.toBe(child.id);
    });

    it('excludes the given folder and its descendants', async () => {
        const store = newStore();
        const a = store.createFolder('A');
        store.createFolder('B', a.id);

        await pickParentFolder(store, 'placeholder', a.id);

        const items = window.showQuickPick.mock.calls[0][0];
        expect(items).toEqual(['$(circle-slash) No Parent (root)']);
    });
});

describe('createSubfolder', () => {
    it('creates a folder nested under the given item', async () => {
        const store = newStore();
        const parent = store.createFolder('Backend');
        window.showInputBox.mockResolvedValue('  Auth Service  ');

        await createSubfolder(store, { folder: parent } as any);

        const child = store.getAllFolders().find(f => f.parentId === parent.id);
        expect(child?.name).toBe('Auth Service');

        const validateInput = window.showInputBox.mock.calls[0][0].validateInput;
        expect(validateInput('   ')).toMatch(/cannot be empty/);
        expect(validateInput('Auth Service')).toBeUndefined();
    });

    it('does nothing when the input is cancelled', async () => {
        const store = newStore();
        const parent = store.createFolder('Backend');
        window.showInputBox.mockResolvedValue(undefined);

        await createSubfolder(store, { folder: parent } as any);

        expect(store.getAllFolders().filter(f => f.parentId === parent.id)).toHaveLength(0);
    });

    it('refuses with a warning when nesting would exceed the max depth', async () => {
        const store = newStore();
        const l1 = store.createFolder('L1');
        const l2 = store.createFolder('L2', l1.id);
        const l3 = store.createFolder('L3', l2.id);

        await createSubfolder(store, { folder: l3 } as any);

        expect(window.showWarningMessage).toHaveBeenCalledOnce();
        expect(window.showInputBox).not.toHaveBeenCalled();
    });
});

describe('moveFolderToParent', () => {
    it('reparents the folder to the picked parent', async () => {
        const store = newStore();
        const a = store.createFolder('A');
        const b = store.createFolder('B');
        window.showQuickPick.mockResolvedValue('A');

        await moveFolderToParent(store, { folder: b } as any);

        expect(store.getAllFolders().find(f => f.id === b.id)?.parentId).toBe(a.id);
    });

    it('does nothing when the picker is cancelled', async () => {
        const store = newStore();
        const a = store.createFolder('A');
        window.showQuickPick.mockResolvedValue(undefined);

        await moveFolderToParent(store, { folder: a } as any);

        expect(store.getAllFolders().find(f => f.id === a.id)?.parentId).toBeNull();
    });
});

describe('moveToFolder', () => {
    it('moves the bookmark to the picked folder', async () => {
        const store = newStore();
        store.addBookmark(makeBookmark({ id: 'a' }));
        const folder = store.createFolder('Backend');
        window.showQuickPick.mockResolvedValue('Backend');

        await moveToFolder(store, { bookmark: makeBookmark({ id: 'a' }) } as any);

        expect(store.getAllBookmarks()[0].folderId).toBe(folder.id);
    });

    it('does nothing when the picker is cancelled', async () => {
        const store = newStore();
        store.addBookmark(makeBookmark({ id: 'a', folderId: 'existing' }));
        window.showQuickPick.mockResolvedValue(undefined);

        await moveToFolder(store, { bookmark: makeBookmark({ id: 'a' }) } as any);

        expect(store.getAllBookmarks()[0].folderId).toBe('existing');
    });
});

describe('addBookmarksToFolder', () => {
    it('adds every target uri into the picked folder', async () => {
        const store = newStore();
        workspace.getWorkspaceFolder.mockReturnValue(undefined);
        const folder = store.createFolder('Backend');
        window.showQuickPick.mockResolvedValue('Backend');

        await addBookmarksToFolder(store, undefined, [Uri.file('/repo/a.ts') as any, Uri.file('/repo/b.ts') as any]);

        const bookmarks = store.getAllBookmarks();
        expect(bookmarks).toHaveLength(2);
        expect(bookmarks.every(b => b.folderId === folder.id)).toBe(true);
    });

    it('does nothing when there are no targets', async () => {
        const store = newStore();

        await addBookmarksToFolder(store, undefined, undefined);

        expect(window.showQuickPick).not.toHaveBeenCalled();
    });

    it('does nothing when the picker is cancelled', async () => {
        const store = newStore();
        workspace.getWorkspaceFolder.mockReturnValue(undefined);
        window.showQuickPick.mockResolvedValue(undefined);

        await addBookmarksToFolder(store, Uri.file('/repo/a.ts') as any, undefined);

        expect(store.getAllBookmarks()).toHaveLength(0);
    });
});
