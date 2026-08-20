import * as vscode from 'vscode';

const STORAGE_KEY_BOOKMARKS = 'fileBookmarks.bookmarks';
const STORAGE_KEY_FOLDERS = 'fileBookmarks.folders';
const STORAGE_KEY_VIEW_MODE = 'fileBookmarks.viewMode';
const VIEW_MODE_CONTEXT_KEY = 'workspace-file-bookmarks.viewMode';

type ViewMode = 'tree' | 'list';

export interface Bookmark {
    id: string;
    uri: string;
    label: string;
    relativePath: string;
    workspaceFolderName: string;
    folderId: string | null;
    createdAt: number;
}

export interface BookmarkFolder {
    id: string;
    name: string;
    createdAt: number;
}

export function activate(context: vscode.ExtensionContext) {
    const store = new BookmarkStore(context);
    const provider = new BookmarksTreeProvider(store, context);

    const treeView = vscode.window.createTreeView('workspace-file-bookmarks-view', {
        treeDataProvider: provider,
        showCollapseAll: true
    });

    vscode.commands.executeCommand('setContext', VIEW_MODE_CONTEXT_KEY, provider.getViewMode());

    context.subscriptions.push(
        treeView,
        vscode.commands.registerCommand('workspace-file-bookmarks.addBookmark', () => addActiveFileBookmark(store)),
        vscode.commands.registerCommand('workspace-file-bookmarks.addBookmarkFromExplorer', (uri: vscode.Uri | undefined, uris: vscode.Uri[] | undefined) => addBookmarksForUris(store, uri, uris)),
        vscode.commands.registerCommand('workspace-file-bookmarks.addBookmarkToFolder', (uri: vscode.Uri | undefined, uris: vscode.Uri[] | undefined) => addBookmarksToFolder(store, uri, uris)),
        vscode.commands.registerCommand('workspace-file-bookmarks.removeBookmark', (item: BookmarkTreeItem) => store.removeBookmark(item.bookmark.id)),
        vscode.commands.registerCommand('workspace-file-bookmarks.openBookmark', (bookmark: Bookmark) => openBookmark(bookmark)),
        vscode.commands.registerCommand('workspace-file-bookmarks.createFolder', () => createFolder(store)),
        vscode.commands.registerCommand('workspace-file-bookmarks.renameFolder', (item: FolderGroupItem) => renameFolder(store, item)),
        vscode.commands.registerCommand('workspace-file-bookmarks.deleteFolder', (item: FolderGroupItem) => deleteFolder(store, item)),
        vscode.commands.registerCommand('workspace-file-bookmarks.moveToFolder', (item: BookmarkTreeItem) => moveToFolder(store, item)),
        vscode.commands.registerCommand('workspace-file-bookmarks.openAllInFolder', (item: FolderGroupItem) => openAllInFolder(store, item)),
        vscode.commands.registerCommand('workspace-file-bookmarks.setViewModeList', () => provider.setViewMode('list')),
        vscode.commands.registerCommand('workspace-file-bookmarks.setViewModeTree', () => provider.setViewMode('tree'))
    );
}

export function deactivate() {}

export class BookmarkStore {
    private readonly _onDidChange = new vscode.EventEmitter<void>();
    readonly onDidChange = this._onDidChange.event;

    constructor(private readonly context: vscode.ExtensionContext) {}

    getAllBookmarks(): Bookmark[] {
        return this.context.workspaceState.get<Bookmark[]>(STORAGE_KEY_BOOKMARKS, []);
    }

    getAllFolders(): BookmarkFolder[] {
        return this.context.workspaceState.get<BookmarkFolder[]>(STORAGE_KEY_FOLDERS, []);
    }

    addBookmark(bookmark: Bookmark) {
        const existing = this.getAllBookmarks();
        if (existing.some(b => b.uri === bookmark.uri)) {
            vscode.window.showInformationMessage(`Already bookmarked: ${bookmark.relativePath}`);
            return;
        }
        this.setBookmarks([bookmark, ...existing]);
    }

    removeBookmark(id: string) {
        this.setBookmarks(this.getAllBookmarks().filter(b => b.id !== id));
    }

    moveBookmarkToFolder(id: string, folderId: string | null) {
        this.setBookmarks(this.getAllBookmarks().map(b => (b.id === id ? { ...b, folderId } : b)));
    }

    createFolder(name: string): BookmarkFolder {
        const folder: BookmarkFolder = {
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            name,
            createdAt: Date.now()
        };
        this.setFolders([...this.getAllFolders(), folder]);
        return folder;
    }

    renameFolder(id: string, name: string) {
        this.setFolders(this.getAllFolders().map(f => (f.id === id ? { ...f, name } : f)));
    }

    deleteFolder(id: string) {
        this.setFolders(this.getAllFolders().filter(f => f.id !== id));
        this.setBookmarks(this.getAllBookmarks().map(b => (b.folderId === id ? { ...b, folderId: null } : b)));
    }

    private setBookmarks(bookmarks: Bookmark[]) {
        this.context.workspaceState.update(STORAGE_KEY_BOOKMARKS, bookmarks);
        this._onDidChange.fire();
    }

    private setFolders(folders: BookmarkFolder[]) {
        this.context.workspaceState.update(STORAGE_KEY_FOLDERS, folders);
        this._onDidChange.fire();
    }
}

class FolderGroupItem extends vscode.TreeItem {
    constructor(public readonly folder: BookmarkFolder, public readonly bookmarks: Bookmark[]) {
        super(folder.name, vscode.TreeItemCollapsibleState.Expanded);
        this.contextValue = 'bookmarkFolder';
        this.iconPath = new vscode.ThemeIcon('folder');
        this.description = `${bookmarks.length}`;
    }
}

class BookmarkTreeItem extends vscode.TreeItem {
    constructor(public readonly bookmark: Bookmark, descriptionParts: string[]) {
        super(bookmark.label, vscode.TreeItemCollapsibleState.None);
        this.description = descriptionParts.join(' • ');
        this.tooltip = bookmark.relativePath;
        this.iconPath = new vscode.ThemeIcon('bookmark');
        this.contextValue = 'bookmarkItem';
        this.command = {
            command: 'workspace-file-bookmarks.openBookmark',
            title: 'Open Bookmark',
            arguments: [bookmark]
        };
    }
}

type TreeNode = FolderGroupItem | BookmarkTreeItem;

class BookmarksTreeProvider implements vscode.TreeDataProvider<TreeNode> {
    private readonly _onDidChangeTreeData = new vscode.EventEmitter<void>();
    readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

    private viewMode: ViewMode;

    constructor(private readonly store: BookmarkStore, private readonly context: vscode.ExtensionContext) {
        this.viewMode = this.context.workspaceState.get<ViewMode>(STORAGE_KEY_VIEW_MODE, 'tree');
        store.onDidChange(() => this._onDidChangeTreeData.fire());
    }

    getViewMode(): ViewMode {
        return this.viewMode;
    }

    setViewMode(mode: ViewMode) {
        this.viewMode = mode;
        this.context.workspaceState.update(STORAGE_KEY_VIEW_MODE, mode);
        vscode.commands.executeCommand('setContext', VIEW_MODE_CONTEXT_KEY, mode);
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: TreeNode): vscode.TreeItem {
        return element;
    }

    getChildren(element?: TreeNode): TreeNode[] {
        const isMultiRoot = (vscode.workspace.workspaceFolders?.length ?? 0) > 1;
        const folders = this.store.getAllFolders();
        const bookmarks = this.store.getAllBookmarks();

        if (this.viewMode === 'list') {
            if (element) {
                return [];
            }
            const folderById = new Map(folders.map(f => [f.id, f.name]));
            return bookmarks
                .slice()
                .sort((a, b) => b.createdAt - a.createdAt)
                .map(b => new BookmarkTreeItem(b, describeBookmark(b, isMultiRoot, folderById.get(b.folderId ?? '') ?? null)));
        }

        if (element instanceof FolderGroupItem) {
            return element.bookmarks
                .slice()
                .sort((a, b) => b.createdAt - a.createdAt)
                .map(b => new BookmarkTreeItem(b, describeBookmark(b, isMultiRoot, null)));
        }

        if (element) {
            return [];
        }

        const folderNodes = folders
            .slice()
            .sort((a, b) => a.name.localeCompare(b.name))
            .map(folder => new FolderGroupItem(folder, bookmarks.filter(b => b.folderId === folder.id)));

        const ungrouped = bookmarks
            .filter(b => !b.folderId)
            .sort((a, b) => b.createdAt - a.createdAt)
            .map(b => new BookmarkTreeItem(b, describeBookmark(b, isMultiRoot, null)));

        return [...folderNodes, ...ungrouped];
    }
}

export function describeBookmark(bookmark: Bookmark, isMultiRoot: boolean, folderName: string | null): string[] {
    const parts: string[] = [];
    if (folderName) {
        parts.push(folderName);
    }
    if (isMultiRoot) {
        parts.push(bookmark.workspaceFolderName);
    }
    parts.push(bookmark.relativePath);
    return parts;
}

function toBookmark(uri: vscode.Uri): Bookmark {
    const workspaceFolder = vscode.workspace.getWorkspaceFolder(uri);
    const workspaceFolderName = workspaceFolder?.name ?? 'Workspace';
    const relativePath = workspaceFolder ? vscode.workspace.asRelativePath(uri, false) : uri.fsPath;
    const label = relativePath.split('/').pop() || relativePath;

    return {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        uri: uri.toString(),
        label,
        relativePath,
        workspaceFolderName,
        folderId: null,
        createdAt: Date.now()
    };
}

function addActiveFileBookmark(store: BookmarkStore) {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        vscode.window.showWarningMessage('Open a file to bookmark it.');
        return;
    }
    store.addBookmark(toBookmark(editor.document.uri));
}

function addBookmarksForUris(store: BookmarkStore, uri: vscode.Uri | undefined, uris: vscode.Uri[] | undefined) {
    const targets = uris && uris.length > 0 ? uris : uri ? [uri] : [];
    for (const target of targets) {
        store.addBookmark(toBookmark(target));
    }
}

async function openBookmark(bookmark: Bookmark) {
    try {
        const uri = vscode.Uri.parse(bookmark.uri);
        const document = await vscode.workspace.openTextDocument(uri);
        await vscode.window.showTextDocument(document, { preview: false });
    } catch {
        vscode.window.showErrorMessage(`Could not open "${bookmark.relativePath}". The file may have been moved or deleted.`);
    }
}

async function openAllInFolder(store: BookmarkStore, item: FolderGroupItem) {
    if (item.bookmarks.length === 0) {
        vscode.window.showInformationMessage(`"${item.folder.name}" has no bookmarks.`);
        return;
    }
    for (const bookmark of item.bookmarks) {
        await openBookmark(bookmark);
    }
}

async function createFolder(store: BookmarkStore) {
    const name = await vscode.window.showInputBox({
        prompt: 'New bookmark folder name',
        placeHolder: 'e.g. Backend, In Review, TODO',
        validateInput: value => (value.trim().length === 0 ? 'Folder name cannot be empty.' : undefined)
    });
    if (name) {
        store.createFolder(name.trim());
    }
}

async function renameFolder(store: BookmarkStore, item: FolderGroupItem) {
    const name = await vscode.window.showInputBox({
        prompt: 'Rename bookmark folder',
        value: item.folder.name,
        validateInput: value => (value.trim().length === 0 ? 'Folder name cannot be empty.' : undefined)
    });
    if (name) {
        store.renameFolder(item.folder.id, name.trim());
    }
}

async function deleteFolder(store: BookmarkStore, item: FolderGroupItem) {
    if (item.bookmarks.length > 0) {
        const confirm = await vscode.window.showWarningMessage(
            `Delete folder "${item.folder.name}"? ${item.bookmarks.length} bookmark(s) will move to the root list.`,
            { modal: true },
            'Delete'
        );
        if (confirm !== 'Delete') {
            return;
        }
    }
    store.deleteFolder(item.folder.id);
}

const NEW_FOLDER_PICK = '$(new-folder) New Folder...';
const NO_FOLDER_PICK = '$(circle-slash) No Folder (root)';

/** Prompts the user to choose a bookmark folder. Returns `undefined` if cancelled, `null` for root. */
async function pickFolder(store: BookmarkStore, placeHolder: string): Promise<string | null | undefined> {
    const folders = store.getAllFolders();
    const picked = await vscode.window.showQuickPick(
        [NO_FOLDER_PICK, ...folders.map(f => f.name), NEW_FOLDER_PICK],
        { placeHolder }
    );
    if (!picked) {
        return undefined;
    }

    if (picked === NO_FOLDER_PICK) {
        return null;
    }

    if (picked === NEW_FOLDER_PICK) {
        const name = await vscode.window.showInputBox({
            prompt: 'New bookmark folder name',
            validateInput: value => (value.trim().length === 0 ? 'Folder name cannot be empty.' : undefined)
        });
        if (!name) {
            return undefined;
        }
        return store.createFolder(name.trim()).id;
    }

    return folders.find(f => f.name === picked)?.id ?? undefined;
}

async function moveToFolder(store: BookmarkStore, item: BookmarkTreeItem) {
    const folderId = await pickFolder(store, `Move "${item.bookmark.label}" to...`);
    if (folderId === undefined) {
        return;
    }
    store.moveBookmarkToFolder(item.bookmark.id, folderId);
}

async function addBookmarksToFolder(store: BookmarkStore, uri: vscode.Uri | undefined, uris: vscode.Uri[] | undefined) {
    const targets = uris && uris.length > 0 ? uris : uri ? [uri] : [];
    if (targets.length === 0) {
        return;
    }
    const placeHolder = targets.length > 1 ? `Add ${targets.length} files to...` : `Add "${toBookmark(targets[0]).label}" to...`;
    const folderId = await pickFolder(store, placeHolder);
    if (folderId === undefined) {
        return;
    }
    for (const target of targets) {
        store.addBookmark({ ...toBookmark(target), folderId });
    }
}
