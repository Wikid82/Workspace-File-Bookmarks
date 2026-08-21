import { describe, it, expect, vi } from 'vitest';
import {
    BookmarkStore,
    addActiveFileBookmark,
    addBookmarksForUris,
    addBookmarksToFolder,
    createFolder,
    deleteFolder,
    moveToFolder,
    openAllInFolder,
    openBookmark,
    pickFolder,
    renameBookmark,
    renameFolder,
    type Bookmark,
    type BookmarkFolder
} from '../extension';
import { createFakeContext } from './fakeContext';
import { Uri, window, workspace } from './vscode-mock';

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

describe('deleteFolder', () => {
    it('deletes an empty folder without confirming', async () => {
        const store = newStore();
        const folder = store.createFolder('Backend');

        await deleteFolder(store, { folder, bookmarks: [] } as any);

        expect(store.getAllFolders()).toHaveLength(0);
        expect(window.showWarningMessage).not.toHaveBeenCalled();
    });

    it('deletes a non-empty folder only after confirmation', async () => {
        const store = newStore();
        const folder = store.createFolder('Backend');
        window.showWarningMessage.mockResolvedValue('Delete');

        await deleteFolder(store, { folder, bookmarks: [makeBookmark()] } as any);

        expect(store.getAllFolders()).toHaveLength(0);
    });

    it('keeps a non-empty folder when the confirmation is declined', async () => {
        const store = newStore();
        const folder = store.createFolder('Backend');
        window.showWarningMessage.mockResolvedValue(undefined);

        await deleteFolder(store, { folder, bookmarks: [makeBookmark()] } as any);

        expect(store.getAllFolders()).toHaveLength(1);
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
