import * as assert from 'node:assert/strict';
import * as path from 'node:path';
import * as vscode from 'vscode';
import type { BookmarkTreeItem, ExtensionApi, FolderGroupItem } from '../../extension';

// The running extension is loaded from dist/extension.cjs by the test host, while this
// test file is compiled from a separate esbuild pass — so its classes are a *different*
// module instance and `instanceof` across the two would silently always fail. Duck-type
// tree nodes by shape instead of importing the classes as values.
function isBookmarkNode(node: BookmarkTreeItem | FolderGroupItem): node is BookmarkTreeItem {
    return 'bookmark' in node;
}

const EXTENSION_ID = 'Wikid82.workspace-file-bookmarks';

async function getApi(): Promise<ExtensionApi> {
    const extension = vscode.extensions.getExtension<ExtensionApi>(EXTENSION_ID);
    assert.ok(extension, `extension "${EXTENSION_ID}" is not installed in the test host`);
    return extension.isActive ? extension.exports : await extension.activate();
}

function fixtureUri(relativePath: string): vscode.Uri {
    const [workspaceFolder] = vscode.workspace.workspaceFolders ?? [];
    assert.ok(workspaceFolder, 'expected the e2e fixture workspace to be open');
    return vscode.Uri.file(path.join(workspaceFolder.uri.fsPath, relativePath));
}

describe('Workspace File Bookmarks (e2e)', () => {
    beforeEach(async () => {
        const { store, provider } = await getApi();
        for (const bookmark of store.getAllBookmarks()) {
            store.removeBookmark(bookmark.id);
        }
        for (const folder of store.getAllFolders()) {
            store.deleteFolder(folder.id);
        }
        provider.setTagFilter(null);
    });

    it('activates and registers every contributed command', async () => {
        await getApi();
        const commands = await vscode.commands.getCommands(true);

        for (const id of [
            'workspace-file-bookmarks.addBookmark',
            'workspace-file-bookmarks.addBookmarkFromExplorer',
            'workspace-file-bookmarks.addBookmarkToFolder',
            'workspace-file-bookmarks.removeBookmark',
            'workspace-file-bookmarks.renameBookmark',
            'workspace-file-bookmarks.editTags',
            'workspace-file-bookmarks.filterByTag',
            'workspace-file-bookmarks.clearTagFilter',
            'workspace-file-bookmarks.openBookmark',
            'workspace-file-bookmarks.createFolder',
            'workspace-file-bookmarks.renameFolder',
            'workspace-file-bookmarks.deleteFolder',
            'workspace-file-bookmarks.moveToFolder',
            'workspace-file-bookmarks.openAllInFolder',
            'workspace-file-bookmarks.setViewModeList',
            'workspace-file-bookmarks.setViewModeTree'
        ]) {
            assert.ok(commands.includes(id), `expected command "${id}" to be registered`);
        }
    });

    it('bookmarks the active editor via the addBookmark command and lists it in the tree', async () => {
        const { store, provider } = await getApi();
        const document = await vscode.workspace.openTextDocument(fixtureUri('src/sample-a.ts'));
        await vscode.window.showTextDocument(document);

        await vscode.commands.executeCommand('workspace-file-bookmarks.addBookmark');

        const bookmarks = store.getAllBookmarks();
        assert.equal(bookmarks.length, 1);
        assert.equal(bookmarks[0].relativePath, 'src/sample-a.ts');

        const children = provider.getChildren() as BookmarkTreeItem[];
        assert.equal(children.length, 1);
        assert.equal(children[0].bookmark.relativePath, 'src/sample-a.ts');
    });

    it('removes a bookmark via the removeBookmark command', async () => {
        const { store, provider } = await getApi();
        const document = await vscode.workspace.openTextDocument(fixtureUri('src/sample-a.ts'));
        await vscode.window.showTextDocument(document);
        await vscode.commands.executeCommand('workspace-file-bookmarks.addBookmark');
        const [item] = provider.getChildren() as BookmarkTreeItem[];

        await vscode.commands.executeCommand('workspace-file-bookmarks.removeBookmark', item);

        assert.deepEqual(store.getAllBookmarks(), []);
    });

    it('groups a bookmark under a folder created and assigned via commands', async () => {
        const { store, provider } = await getApi();
        const folder = store.createFolder('Backend');
        const document = await vscode.workspace.openTextDocument(fixtureUri('src/sample-b.ts'));
        await vscode.window.showTextDocument(document);
        await vscode.commands.executeCommand('workspace-file-bookmarks.addBookmark');
        const [bookmarkItem] = (provider.getChildren() as (BookmarkTreeItem | FolderGroupItem)[]).filter(isBookmarkNode);

        store.moveBookmarkToFolder(bookmarkItem.bookmark.id, folder.id);

        const [folderNode] = provider.getChildren() as FolderGroupItem[];
        assert.equal(folderNode.folder.name, 'Backend');
        const folderChildren = provider.getChildren(folderNode) as BookmarkTreeItem[];
        assert.equal(folderChildren.length, 1);
        assert.equal(folderChildren[0].bookmark.relativePath, 'src/sample-b.ts');
    });

    it('shows tags in the tree description and narrows the tree via the active tag filter', async () => {
        const { store, provider } = await getApi();
        const tagged = await vscode.workspace.openTextDocument(fixtureUri('src/sample-a.ts'));
        await vscode.window.showTextDocument(tagged);
        await vscode.commands.executeCommand('workspace-file-bookmarks.addBookmark');
        const untagged = await vscode.workspace.openTextDocument(fixtureUri('src/sample-b.ts'));
        await vscode.window.showTextDocument(untagged);
        await vscode.commands.executeCommand('workspace-file-bookmarks.addBookmark');
        const [taggedBookmark] = store.getAllBookmarks().filter(b => b.relativePath === 'src/sample-a.ts');
        store.setBookmarkTags(taggedBookmark.id, ['auth']);

        const taggedItem = (provider.getChildren() as BookmarkTreeItem[]).find(c => c.bookmark.id === taggedBookmark.id);
        assert.ok(taggedItem?.description?.toString().includes('#auth'));

        provider.setTagFilter('auth');
        const filtered = provider.getChildren() as BookmarkTreeItem[];
        assert.equal(filtered.length, 1);
        assert.equal(filtered[0].bookmark.id, taggedBookmark.id);

        provider.setTagFilter(null);
        assert.equal((provider.getChildren() as BookmarkTreeItem[]).length, 2);
    });
});
