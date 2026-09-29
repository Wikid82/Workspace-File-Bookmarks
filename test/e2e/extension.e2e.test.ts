import * as assert from 'node:assert/strict';
import * as os from 'node:os';
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
    provider.setSearchFilter(null);
  });

  it('activates and registers every contributed command', async () => {
    await getApi();
    const commands = await vscode.commands.getCommands(true);

    for (const id of [
      'workspace-file-bookmarks.addBookmark',
      'workspace-file-bookmarks.addBookmarkForSelection',
      'workspace-file-bookmarks.addBookmarkFromExplorer',
      'workspace-file-bookmarks.addBookmarkToFolder',
      'workspace-file-bookmarks.removeBookmark',
      'workspace-file-bookmarks.renameBookmark',
      'workspace-file-bookmarks.editTags',
      'workspace-file-bookmarks.filterByTag',
      'workspace-file-bookmarks.clearTagFilter',
      'workspace-file-bookmarks.filterBookmarks',
      'workspace-file-bookmarks.clearSearchFilter',
      'workspace-file-bookmarks.openBookmark',
      'workspace-file-bookmarks.createFolder',
      'workspace-file-bookmarks.createSubfolder',
      'workspace-file-bookmarks.moveFolderToParent',
      'workspace-file-bookmarks.renameFolder',
      'workspace-file-bookmarks.deleteFolder',
      'workspace-file-bookmarks.moveToFolder',
      'workspace-file-bookmarks.openAllInFolder',
      'workspace-file-bookmarks.setViewModeList',
      'workspace-file-bookmarks.setViewModeTree',
      'workspace-file-bookmarks.exportBookmarks',
      'workspace-file-bookmarks.importBookmarks',
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

  it('bookmarks a line range via addBookmarkForSelection, shows it in the tree, and restores the selection on open', async () => {
    const { store, provider } = await getApi();
    const document = await vscode.workspace.openTextDocument(fixtureUri('src/sample-multiline.ts'));
    const editor = await vscode.window.showTextDocument(document);
    editor.selection = new vscode.Selection(new vscode.Position(4, 0), new vscode.Position(5, 1));

    await vscode.commands.executeCommand('workspace-file-bookmarks.addBookmarkForSelection');

    const bookmarks = store.getAllBookmarks();
    assert.equal(bookmarks.length, 1);
    assert.equal(bookmarks[0].relativePath, 'src/sample-multiline.ts');
    assert.equal(bookmarks[0].lineStart, 5);
    assert.equal(bookmarks[0].lineEnd, 6);
    assert.equal(bookmarks[0].label, 'sample-multiline.ts:L5-6');

    const [item] = provider.getChildren() as BookmarkTreeItem[];
    assert.ok(item.description?.toString().includes('L5-6'));

    editor.selection = new vscode.Selection(new vscode.Position(0, 0), new vscode.Position(0, 0));
    await vscode.commands.executeCommand('workspace-file-bookmarks.openBookmark', item.bookmark);

    const activeEditor = vscode.window.activeTextEditor;
    assert.ok(activeEditor);
    assert.equal(activeEditor.selection.start.line, 4);
    assert.equal(activeEditor.selection.end.line, 5);
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
    const [bookmarkItem] = (
      provider.getChildren() as (BookmarkTreeItem | FolderGroupItem)[]
    ).filter(isBookmarkNode);

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
    const [taggedBookmark] = store
      .getAllBookmarks()
      .filter((b) => b.relativePath === 'src/sample-a.ts');
    store.setBookmarkTags(taggedBookmark.id, ['auth']);

    const taggedItem = (provider.getChildren() as BookmarkTreeItem[]).find(
      (c) => c.bookmark.id === taggedBookmark.id,
    );
    assert.ok(taggedItem?.description?.toString().includes('#auth'));

    provider.setTagFilter('auth');
    const filtered = provider.getChildren() as BookmarkTreeItem[];
    assert.equal(filtered.length, 1);
    assert.equal(filtered[0].bookmark.id, taggedBookmark.id);

    provider.setTagFilter(null);
    assert.equal((provider.getChildren() as BookmarkTreeItem[]).length, 2);
  });

  it('narrows the tree via the active search filter, matching label, path, or repo', async () => {
    const { store, provider } = await getApi();
    const matching = await vscode.workspace.openTextDocument(fixtureUri('src/sample-a.ts'));
    await vscode.window.showTextDocument(matching);
    await vscode.commands.executeCommand('workspace-file-bookmarks.addBookmark');
    const other = await vscode.workspace.openTextDocument(fixtureUri('src/sample-b.ts'));
    await vscode.window.showTextDocument(other);
    await vscode.commands.executeCommand('workspace-file-bookmarks.addBookmark');
    const [matchingBookmark] = store
      .getAllBookmarks()
      .filter((b) => b.relativePath === 'src/sample-a.ts');

    provider.setSearchFilter('sample-a');
    const filtered = provider.getChildren() as BookmarkTreeItem[];
    assert.equal(filtered.length, 1);
    assert.equal(filtered[0].bookmark.id, matchingBookmark.id);

    provider.setSearchFilter(null);
    assert.equal((provider.getChildren() as BookmarkTreeItem[]).length, 2);
  });

  it('opens a live filter input box via the filterBookmarks command', async () => {
    const { provider } = await getApi();

    const inputBox = await vscode.commands.executeCommand<vscode.InputBox>(
      'workspace-file-bookmarks.filterBookmarks',
    );

    assert.ok(inputBox, 'expected the filterBookmarks command to return the created input box');
    inputBox.hide();
    provider.setSearchFilter(null);
  });

  it('nests a subfolder under another folder, recurses through the real tree, and reparents via drag-and-drop', async () => {
    const { store, provider } = await getApi();
    const parent = store.createFolder('Backend');
    const child = store.createFolder('Auth Service', parent.id);
    const document = await vscode.workspace.openTextDocument(fixtureUri('src/sample-a.ts'));
    await vscode.window.showTextDocument(document);
    await vscode.commands.executeCommand('workspace-file-bookmarks.addBookmark');
    const [bookmarkItem] = (
      provider.getChildren() as (BookmarkTreeItem | FolderGroupItem)[]
    ).filter(isBookmarkNode);
    store.moveBookmarkToFolder(bookmarkItem.bookmark.id, child.id);

    const [parentNode] = provider.getChildren() as FolderGroupItem[];
    assert.equal(parentNode.folder.id, parent.id);
    const [childNode] = provider.getChildren(parentNode) as FolderGroupItem[];
    assert.equal(childNode.folder.id, child.id);
    const grandchildren = provider.getChildren(childNode) as BookmarkTreeItem[];
    assert.equal(grandchildren.length, 1);
    assert.equal(grandchildren[0].bookmark.relativePath, 'src/sample-a.ts');

    // Reparent the child back to the root via the real drag-and-drop handler.
    const dataTransfer = new vscode.DataTransfer();
    provider.handleDrag([childNode], dataTransfer);
    await provider.handleDrop(undefined, dataTransfer);
    assert.equal(store.getAllFolders().find((f) => f.id === child.id)?.parentId, null);
  });

  it('round-trips bookmarks and folders through exportBookmarks and importBookmarks', async () => {
    const { store } = await getApi();
    const folder = store.createFolder('Backend');
    const document = await vscode.workspace.openTextDocument(fixtureUri('src/sample-a.ts'));
    await vscode.window.showTextDocument(document);
    await vscode.commands.executeCommand('workspace-file-bookmarks.addBookmark');
    store.moveBookmarkToFolder(store.getAllBookmarks()[0].id, folder.id);
    const exportUri = vscode.Uri.file(path.join(os.tmpdir(), `wfb-e2e-export-${Date.now()}.json`));

    const originalShowSaveDialog = vscode.window.showSaveDialog;
    const originalShowOpenDialog = vscode.window.showOpenDialog;
    const originalShowQuickPick = vscode.window.showQuickPick;
    try {
      (vscode.window as any).showSaveDialog = async () => exportUri;
      await vscode.commands.executeCommand('workspace-file-bookmarks.exportBookmarks');

      const written = JSON.parse(
        Buffer.from(await vscode.workspace.fs.readFile(exportUri)).toString('utf8'),
      );
      assert.equal(written.bookmarks.length, 1);
      assert.equal(written.folders.length, 1);

      for (const bookmark of store.getAllBookmarks()) {
        store.removeBookmark(bookmark.id);
      }
      for (const existingFolder of store.getAllFolders()) {
        store.deleteFolder(existingFolder.id);
      }

      (vscode.window as any).showOpenDialog = async () => [exportUri];
      (vscode.window as any).showQuickPick = async () => 'Merge with existing bookmarks';
      await vscode.commands.executeCommand('workspace-file-bookmarks.importBookmarks');

      assert.equal(store.getAllBookmarks().length, 1);
      assert.equal(store.getAllFolders().length, 1);
      assert.equal(store.getAllBookmarks()[0].relativePath, 'src/sample-a.ts');
      assert.equal(store.getAllFolders()[0].name, 'Backend');
    } finally {
      vscode.window.showSaveDialog = originalShowSaveDialog;
      vscode.window.showOpenDialog = originalShowOpenDialog;
      vscode.window.showQuickPick = originalShowQuickPick;
      await vscode.workspace.fs.delete(exportUri);
    }
  });
});
