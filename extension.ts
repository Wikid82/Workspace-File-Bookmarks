import * as vscode from 'vscode';

const STORAGE_KEY = 'fileBookmarks.bookmarks';

interface Bookmark {
    id: string;
    uri: string;
    label: string;
    relativePath: string;
    folderName: string;
    createdAt: number;
}

export function activate(context: vscode.ExtensionContext) {
    const store = new BookmarkStore(context);
    const provider = new BookmarksTreeProvider(store);

    const treeView = vscode.window.createTreeView('workspace-file-bookmarks-view', {
        treeDataProvider: provider,
        showCollapseAll: true
    });

    context.subscriptions.push(
        treeView,
        vscode.commands.registerCommand('workspace-file-bookmarks.addBookmark', () => addActiveFileBookmark(store)),
        vscode.commands.registerCommand('workspace-file-bookmarks.addBookmarkFromExplorer', (uri: vscode.Uri | undefined) => addBookmarkForUri(store, uri)),
        vscode.commands.registerCommand('workspace-file-bookmarks.removeBookmark', (item: BookmarkTreeItem) => store.remove(item.bookmark.id)),
        vscode.commands.registerCommand('workspace-file-bookmarks.openBookmark', (bookmark: Bookmark) => openBookmark(bookmark))
    );
}

export function deactivate() {}

class BookmarkStore {
    private readonly _onDidChange = new vscode.EventEmitter<void>();
    readonly onDidChange = this._onDidChange.event;

    constructor(private readonly context: vscode.ExtensionContext) {}

    getAll(): Bookmark[] {
        return this.context.workspaceState.get<Bookmark[]>(STORAGE_KEY, []);
    }

    add(bookmark: Bookmark) {
        const existing = this.getAll();
        if (existing.some(b => b.uri === bookmark.uri)) {
            vscode.window.showInformationMessage(`Already bookmarked: ${bookmark.relativePath}`);
            return;
        }
        this.setAll([bookmark, ...existing]);
    }

    remove(id: string) {
        this.setAll(this.getAll().filter(b => b.id !== id));
    }

    private setAll(bookmarks: Bookmark[]) {
        this.context.workspaceState.update(STORAGE_KEY, bookmarks);
        this._onDidChange.fire();
    }
}

class FolderGroupItem extends vscode.TreeItem {
    constructor(public readonly folderName: string, public readonly bookmarks: Bookmark[]) {
        super(folderName, vscode.TreeItemCollapsibleState.Expanded);
        this.contextValue = 'bookmarkFolderGroup';
        this.iconPath = new vscode.ThemeIcon('folder');
        this.description = `${bookmarks.length}`;
    }
}

class BookmarkTreeItem extends vscode.TreeItem {
    constructor(public readonly bookmark: Bookmark) {
        super(bookmark.label, vscode.TreeItemCollapsibleState.None);
        this.description = bookmark.relativePath;
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

    constructor(private readonly store: BookmarkStore) {
        store.onDidChange(() => this._onDidChangeTreeData.fire());
    }

    getTreeItem(element: TreeNode): vscode.TreeItem {
        return element;
    }

    getChildren(element?: TreeNode): TreeNode[] {
        if (element instanceof FolderGroupItem) {
            return element.bookmarks
                .slice()
                .sort((a, b) => b.createdAt - a.createdAt)
                .map(b => new BookmarkTreeItem(b));
        }

        const bookmarks = this.store.getAll();
        const folderNames = new Set(bookmarks.map(b => b.folderName));

        if (folderNames.size <= 1) {
            return bookmarks
                .slice()
                .sort((a, b) => b.createdAt - a.createdAt)
                .map(b => new BookmarkTreeItem(b));
        }

        return Array.from(folderNames)
            .sort()
            .map(name => new FolderGroupItem(name, bookmarks.filter(b => b.folderName === name)));
    }
}

function toBookmark(uri: vscode.Uri): Bookmark {
    const workspaceFolder = vscode.workspace.getWorkspaceFolder(uri);
    const folderName = workspaceFolder?.name ?? 'Workspace';
    const relativePath = workspaceFolder ? vscode.workspace.asRelativePath(uri, false) : uri.fsPath;
    const label = relativePath.split('/').pop() || relativePath;

    return {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        uri: uri.toString(),
        label,
        relativePath,
        folderName,
        createdAt: Date.now()
    };
}

function addActiveFileBookmark(store: BookmarkStore) {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        vscode.window.showWarningMessage('Open a file to bookmark it.');
        return;
    }
    store.add(toBookmark(editor.document.uri));
}

function addBookmarkForUri(store: BookmarkStore, uri: vscode.Uri | undefined) {
    if (!uri) {
        return;
    }
    store.add(toBookmark(uri));
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
