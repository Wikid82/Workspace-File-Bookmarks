import * as vscode from 'vscode';

const STORAGE_KEY_BOOKMARKS = 'fileBookmarks.bookmarks';
const STORAGE_KEY_FOLDERS = 'fileBookmarks.folders';
const STORAGE_KEY_VIEW_MODE = 'fileBookmarks.viewMode';
const VIEW_MODE_CONTEXT_KEY = 'workspace-file-bookmarks.viewMode';
const TAG_FILTER_CONTEXT_KEY = 'workspace-file-bookmarks.tagFilterActive';
const SEARCH_FILTER_CONTEXT_KEY = 'workspace-file-bookmarks.searchFilterActive';

type ViewMode = 'tree' | 'list';

export interface Bookmark {
    id: string;
    uri: string;
    label: string;
    relativePath: string;
    workspaceFolderName: string;
    folderId: string | null;
    createdAt: number;
    order?: number;
    tags?: string[];
}

export interface BookmarkFolder {
    id: string;
    name: string;
    createdAt: number;
    order?: number;
    parentId?: string | null;
}

/** Folders may nest up to this many levels deep (root-level folders are depth 1). */
export const MAX_FOLDER_DEPTH = 3;

export const BOOKMARK_DND_MIME_TYPE = 'application/vnd.code.tree.workspace-file-bookmarks-view';

/** Sorts by explicit `order` when set (ascending), falling back for items without one. Items with an order always sort before items without. */
export function sortByOrder<T extends { order?: number }>(items: T[], fallbackCompare: (a: T, b: T) => number): T[] {
    return items.slice().sort((a, b) => {
        if (a.order !== undefined && b.order !== undefined) {
            return a.order - b.order;
        }
        if (a.order !== undefined) {
            return -1;
        }
        if (b.order !== undefined) {
            return 1;
        }
        return fallbackCompare(a, b);
    });
}

/** Computes the ordered id list for a drag-and-drop scope: `draggedId` removed then reinserted before `beforeId` (or appended when `beforeId` is null). */
export function computeReorderedIds<T extends { id: string; order?: number }>(
    scopeItems: T[],
    draggedId: string,
    beforeId: string | null,
    fallbackCompare: (a: T, b: T) => number
): string[] {
    const ids = sortByOrder(scopeItems, fallbackCompare)
        .filter(item => item.id !== draggedId)
        .map(item => item.id);
    const insertAt = beforeId ? ids.indexOf(beforeId) : -1;
    if (insertAt === -1) {
        ids.push(draggedId);
    } else {
        ids.splice(insertAt, 0, draggedId);
    }
    return ids;
}

const bookmarkFallbackCompare = (a: Bookmark, b: Bookmark) => b.createdAt - a.createdAt;
const folderFallbackCompare = (a: BookmarkFolder, b: BookmarkFolder) => a.name.localeCompare(b.name);

function folderParentId(folder: BookmarkFolder): string | null {
    return folder.parentId ?? null;
}

/** Number of ancestor folders above `parentId` (0 if `parentId` is null/root). */
function ancestorDepth(folders: BookmarkFolder[], parentId: string | null): number {
    const byId = new Map(folders.map(f => [f.id, f]));
    let depth = 0;
    let current = parentId;
    const seen = new Set<string>();
    while (current && !seen.has(current)) {
        seen.add(current);
        depth++;
        current = byId.get(current)?.parentId ?? null;
    }
    return depth;
}

/** Height of the subtree rooted at `folderId` (0 for a folder with no child folders). */
export function folderSubtreeHeight(folders: BookmarkFolder[], folderId: string): number {
    const children = folders.filter(f => folderParentId(f) === folderId);
    if (children.length === 0) {
        return 0;
    }
    return 1 + Math.max(...children.map(c => folderSubtreeHeight(folders, c.id)));
}

/** Whether `candidateId` is `ancestorId` itself or one of its descendants. */
export function isDescendantFolder(folders: BookmarkFolder[], ancestorId: string, candidateId: string): boolean {
    const byId = new Map(folders.map(f => [f.id, f]));
    let current: string | null = candidateId;
    const seen = new Set<string>();
    while (current && !seen.has(current)) {
        if (current === ancestorId) {
            return true;
        }
        seen.add(current);
        current = byId.get(current)?.parentId ?? null;
    }
    return false;
}

/** Whether nesting a folder (or a subtree of the given height) under `parentId` stays within MAX_FOLDER_DEPTH. */
export function canNestUnder(folders: BookmarkFolder[], parentId: string | null, subtreeHeight = 0): boolean {
    return ancestorDepth(folders, parentId) + 1 + subtreeHeight <= MAX_FOLDER_DEPTH;
}

/** Folders eligible to be a parent: excludes a folder (and its own descendants, via `excludeFolderId`) and any folder where nesting would exceed MAX_FOLDER_DEPTH. */
export function eligibleParentFolders(store: BookmarkStore, options: { excludeFolderId?: string } = {}): BookmarkFolder[] {
    const folders = store.getAllFolders();
    const subtreeHeight = options.excludeFolderId ? folderSubtreeHeight(folders, options.excludeFolderId) : 0;
    return folders.filter(f => {
        if (options.excludeFolderId && (f.id === options.excludeFolderId || isDescendantFolder(folders, options.excludeFolderId, f.id))) {
            return false;
        }
        return canNestUnder(folders, f.id, subtreeHeight);
    });
}

/** Breadcrumb label for a folder, e.g. "Backend › Auth Service". A root-level folder's breadcrumb is just its name. */
export function folderBreadcrumb(folders: BookmarkFolder[], folderId: string): string {
    const byId = new Map(folders.map(f => [f.id, f]));
    const parts: string[] = [];
    let current: string | null = folderId;
    const seen = new Set<string>();
    while (current && !seen.has(current)) {
        const folder = byId.get(current);
        if (!folder) {
            break;
        }
        parts.unshift(folder.name);
        seen.add(current);
        current = folderParentId(folder);
    }
    return parts.join(' › ');
}

/** The extension's public API, returned from `activate()` — used by e2e tests to inspect state that isn't reachable through the tree view UI alone. */
export interface ExtensionApi {
    store: BookmarkStore;
    provider: BookmarksTreeProvider;
}

export function activate(context: vscode.ExtensionContext): ExtensionApi {
    const store = new BookmarkStore(context);
    const provider = new BookmarksTreeProvider(store, context);

    const treeView = vscode.window.createTreeView('workspace-file-bookmarks-view', {
        treeDataProvider: provider,
        showCollapseAll: true,
        dragAndDropController: provider
    });

    vscode.commands.executeCommand('setContext', VIEW_MODE_CONTEXT_KEY, provider.getViewMode());
    vscode.commands.executeCommand('setContext', TAG_FILTER_CONTEXT_KEY, provider.getTagFilter() !== null);
    vscode.commands.executeCommand('setContext', SEARCH_FILTER_CONTEXT_KEY, provider.getSearchFilter() !== null);

    context.subscriptions.push(
        treeView,
        vscode.commands.registerCommand('workspace-file-bookmarks.addBookmark', () => addActiveFileBookmark(store)),
        vscode.commands.registerCommand('workspace-file-bookmarks.addBookmarkFromExplorer', (uri: vscode.Uri | undefined, uris: vscode.Uri[] | undefined) => addBookmarksForUris(store, uri, uris)),
        vscode.commands.registerCommand('workspace-file-bookmarks.addBookmarkToFolder', (uri: vscode.Uri | undefined, uris: vscode.Uri[] | undefined) => addBookmarksToFolder(store, uri, uris)),
        vscode.commands.registerCommand('workspace-file-bookmarks.removeBookmark', (item: BookmarkTreeItem) => store.removeBookmark(item.bookmark.id)),
        vscode.commands.registerCommand('workspace-file-bookmarks.renameBookmark', (item: BookmarkTreeItem) => renameBookmark(store, item)),
        vscode.commands.registerCommand('workspace-file-bookmarks.editTags', (item: BookmarkTreeItem) => editBookmarkTags(store, item)),
        vscode.commands.registerCommand('workspace-file-bookmarks.filterByTag', () => filterByTag(store, provider)),
        vscode.commands.registerCommand('workspace-file-bookmarks.clearTagFilter', () => provider.setTagFilter(null)),
        vscode.commands.registerCommand('workspace-file-bookmarks.filterBookmarks', () => filterBookmarks(provider)),
        vscode.commands.registerCommand('workspace-file-bookmarks.clearSearchFilter', () => provider.setSearchFilter(null)),
        vscode.commands.registerCommand('workspace-file-bookmarks.openBookmark', (bookmark: Bookmark) => openBookmark(bookmark)),
        vscode.commands.registerCommand('workspace-file-bookmarks.createFolder', () => createFolder(store)),
        vscode.commands.registerCommand('workspace-file-bookmarks.createSubfolder', (item: FolderGroupItem) => createSubfolder(store, item)),
        vscode.commands.registerCommand('workspace-file-bookmarks.moveFolderToParent', (item: FolderGroupItem) => moveFolderToParent(store, item)),
        vscode.commands.registerCommand('workspace-file-bookmarks.renameFolder', (item: FolderGroupItem) => renameFolder(store, item)),
        vscode.commands.registerCommand('workspace-file-bookmarks.deleteFolder', (item: FolderGroupItem) => deleteFolder(store, item)),
        vscode.commands.registerCommand('workspace-file-bookmarks.moveToFolder', (item: BookmarkTreeItem) => moveToFolder(store, item)),
        vscode.commands.registerCommand('workspace-file-bookmarks.openAllInFolder', (item: FolderGroupItem) => openAllInFolder(store, item)),
        vscode.commands.registerCommand('workspace-file-bookmarks.setViewModeList', () => provider.setViewMode('list')),
        vscode.commands.registerCommand('workspace-file-bookmarks.setViewModeTree', () => provider.setViewMode('tree'))
    );

    return { store, provider };
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

    renameBookmark(id: string, label: string) {
        this.setBookmarks(this.getAllBookmarks().map(b => (b.id === id ? { ...b, label } : b)));
    }

    setBookmarkTags(id: string, tags: string[]) {
        this.setBookmarks(this.getAllBookmarks().map(b => (b.id === id ? { ...b, tags } : b)));
    }

    /** Every distinct tag across all bookmarks, sorted alphabetically. */
    getAllTags(): string[] {
        const tags = new Set<string>();
        for (const bookmark of this.getAllBookmarks()) {
            for (const tag of bookmark.tags ?? []) {
                tags.add(tag);
            }
        }
        return [...tags].sort((a, b) => a.localeCompare(b));
    }

    /** Assigns sequential `order` values to the bookmarks named in `orderedIds`; bookmarks outside that set are untouched. */
    reorderBookmarks(orderedIds: string[]) {
        const orderById = new Map(orderedIds.map((id, index) => [id, index]));
        this.setBookmarks(this.getAllBookmarks().map(b => (orderById.has(b.id) ? { ...b, order: orderById.get(b.id) } : b)));
    }

    /** Assigns sequential `order` values to the folders named in `orderedIds`; folders outside that set are untouched. */
    reorderFolders(orderedIds: string[]) {
        const orderById = new Map(orderedIds.map((id, index) => [id, index]));
        this.setFolders(this.getAllFolders().map(f => (orderById.has(f.id) ? { ...f, order: orderById.get(f.id) } : f)));
    }

    createFolder(name: string, parentId: string | null = null): BookmarkFolder {
        const folder: BookmarkFolder = {
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            name,
            createdAt: Date.now(),
            parentId
        };
        this.setFolders([...this.getAllFolders(), folder]);
        return folder;
    }

    renameFolder(id: string, name: string) {
        this.setFolders(this.getAllFolders().map(f => (f.id === id ? { ...f, name } : f)));
    }

    moveFolderToParent(id: string, parentId: string | null) {
        this.setFolders(this.getAllFolders().map(f => (f.id === id ? { ...f, parentId } : f)));
    }

    /** Deletes a folder, promoting its direct bookmarks and child folders to the root rather than deleting them. */
    deleteFolder(id: string) {
        this.setFolders(
            this.getAllFolders()
                .filter(f => f.id !== id)
                .map(f => (f.parentId === id ? { ...f, parentId: null } : f))
        );
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

export class FolderGroupItem extends vscode.TreeItem {
    constructor(
        public readonly folder: BookmarkFolder,
        public readonly bookmarks: Bookmark[],
        public readonly childFolders: BookmarkFolder[] = []
    ) {
        super(folder.name, vscode.TreeItemCollapsibleState.Expanded);
        this.contextValue = 'bookmarkFolder';
        this.iconPath = new vscode.ThemeIcon('folder');
        this.description =
            childFolders.length > 0
                ? `${bookmarks.length} • ${childFolders.length} subfolder${childFolders.length === 1 ? '' : 's'}`
                : `${bookmarks.length}`;
    }
}

export class BookmarkTreeItem extends vscode.TreeItem {
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

export class BookmarksTreeProvider implements vscode.TreeDataProvider<TreeNode>, vscode.TreeDragAndDropController<TreeNode> {
    private readonly _onDidChangeTreeData = new vscode.EventEmitter<void>();
    readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

    private viewMode: ViewMode;
    private tagFilter: string | null = null;
    private searchFilter: string | null = null;

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

    getTagFilter(): string | null {
        return this.tagFilter;
    }

    setTagFilter(tag: string | null) {
        this.tagFilter = tag;
        vscode.commands.executeCommand('setContext', TAG_FILTER_CONTEXT_KEY, tag !== null);
        this._onDidChangeTreeData.fire();
    }

    getSearchFilter(): string | null {
        return this.searchFilter;
    }

    setSearchFilter(text: string | null) {
        this.searchFilter = text && text.trim() ? text : null;
        vscode.commands.executeCommand('setContext', SEARCH_FILTER_CONTEXT_KEY, this.searchFilter !== null);
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: TreeNode): vscode.TreeItem {
        return element;
    }

    getChildren(element?: TreeNode): TreeNode[] {
        const isMultiRoot = (vscode.workspace.workspaceFolders?.length ?? 0) > 1;
        const folders = this.store.getAllFolders();
        const tagFilter = this.tagFilter;
        const searchFilter = this.searchFilter;
        let bookmarks = this.store.getAllBookmarks();
        if (tagFilter) {
            bookmarks = bookmarks.filter(b => (b.tags ?? []).includes(tagFilter));
        }
        if (searchFilter) {
            bookmarks = bookmarks.filter(b => matchesSearchFilter(b, searchFilter));
        }

        if (this.viewMode === 'list') {
            if (element) {
                return [];
            }
            return sortByOrder(bookmarks, bookmarkFallbackCompare).map(
                b => new BookmarkTreeItem(b, describeBookmark(b, isMultiRoot, folderBreadcrumb(folders, b.folderId ?? '') || null))
            );
        }

        const buildFolderNode = (folder: BookmarkFolder): FolderGroupItem =>
            new FolderGroupItem(
                folder,
                bookmarks.filter(b => b.folderId === folder.id),
                folders.filter(f => (f.parentId ?? null) === folder.id)
            );

        if (element instanceof FolderGroupItem) {
            const childFolderNodes = sortByOrder(element.childFolders, folderFallbackCompare).map(buildFolderNode);
            const childBookmarkNodes = sortByOrder(element.bookmarks, bookmarkFallbackCompare).map(
                b => new BookmarkTreeItem(b, describeBookmark(b, isMultiRoot, null))
            );
            return [...childFolderNodes, ...childBookmarkNodes];
        }

        if (element) {
            return [];
        }

        const folderNodes = sortByOrder(
            folders.filter(f => (f.parentId ?? null) === null),
            folderFallbackCompare
        ).map(buildFolderNode);

        const ungrouped = sortByOrder(
            bookmarks.filter(b => !b.folderId),
            bookmarkFallbackCompare
        ).map(b => new BookmarkTreeItem(b, describeBookmark(b, isMultiRoot, null)));

        return [...folderNodes, ...ungrouped];
    }

    get dropMimeTypes(): string[] {
        return [BOOKMARK_DND_MIME_TYPE];
    }

    get dragMimeTypes(): string[] {
        return [BOOKMARK_DND_MIME_TYPE];
    }

    handleDrag(source: readonly TreeNode[], dataTransfer: vscode.DataTransfer): void {
        const item = source[0];
        if (!item) {
            return;
        }
        const payload = item instanceof BookmarkTreeItem
            ? { kind: 'bookmark' as const, id: item.bookmark.id }
            : { kind: 'folder' as const, id: item.folder.id };
        dataTransfer.set(BOOKMARK_DND_MIME_TYPE, new vscode.DataTransferItem(JSON.stringify(payload)));
    }

    async handleDrop(target: TreeNode | undefined, dataTransfer: vscode.DataTransfer): Promise<void> {
        const transferItem = dataTransfer.get(BOOKMARK_DND_MIME_TYPE);
        if (!transferItem) {
            return;
        }
        const payload = JSON.parse(await transferItem.asString()) as { kind: 'bookmark' | 'folder'; id: string };
        if (payload.kind === 'folder') {
            dropFolder(this.store, payload.id, target);
        } else {
            dropBookmark(this.store, payload.id, target, this.viewMode);
        }
    }
}

/** Case-insensitive substring match against a bookmark's label, relative path, and workspace folder name. */
export function matchesSearchFilter(bookmark: Bookmark, query: string): boolean {
    const needle = query.trim().toLowerCase();
    if (!needle) {
        return true;
    }
    return [bookmark.label, bookmark.relativePath, bookmark.workspaceFolderName].some(field =>
        field.toLowerCase().includes(needle)
    );
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
    if (bookmark.tags && bookmark.tags.length > 0) {
        parts.push(bookmark.tags.map(tag => `#${tag}`).join(' '));
    }
    return parts;
}

export function toBookmark(uri: vscode.Uri): Bookmark {
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

export function addActiveFileBookmark(store: BookmarkStore) {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        vscode.window.showWarningMessage('Open a file to bookmark it.');
        return;
    }
    store.addBookmark(toBookmark(editor.document.uri));
}

export function addBookmarksForUris(store: BookmarkStore, uri: vscode.Uri | undefined, uris: vscode.Uri[] | undefined) {
    const targets = uris && uris.length > 0 ? uris : uri ? [uri] : [];
    for (const target of targets) {
        store.addBookmark(toBookmark(target));
    }
}

export async function openBookmark(bookmark: Bookmark) {
    try {
        const uri = vscode.Uri.parse(bookmark.uri);
        const document = await vscode.workspace.openTextDocument(uri);
        await vscode.window.showTextDocument(document, { preview: false });
    } catch {
        vscode.window.showErrorMessage(`Could not open "${bookmark.relativePath}". The file may have been moved or deleted.`);
    }
}

export async function openAllInFolder(store: BookmarkStore, item: FolderGroupItem) {
    if (item.bookmarks.length === 0) {
        vscode.window.showInformationMessage(`"${item.folder.name}" has no bookmarks.`);
        return;
    }
    for (const bookmark of item.bookmarks) {
        await openBookmark(bookmark);
    }
}

export async function createFolder(store: BookmarkStore) {
    const name = await vscode.window.showInputBox({
        prompt: 'New bookmark folder name',
        placeHolder: 'e.g. Backend, In Review, TODO',
        validateInput: value => (value.trim().length === 0 ? 'Folder name cannot be empty.' : undefined)
    });
    if (name) {
        store.createFolder(name.trim());
    }
}

/** Creates a subfolder directly under `item.folder`, skipping the parent picker since the parent is implied by the context menu. */
export async function createSubfolder(store: BookmarkStore, item: FolderGroupItem) {
    if (!canNestUnder(store.getAllFolders(), item.folder.id)) {
        vscode.window.showWarningMessage(`Can't create a subfolder here — maximum folder depth (${MAX_FOLDER_DEPTH}) reached.`);
        return;
    }
    const name = await vscode.window.showInputBox({
        prompt: `New subfolder in "${item.folder.name}"`,
        placeHolder: 'e.g. Auth Service, Billing Service',
        validateInput: value => (value.trim().length === 0 ? 'Folder name cannot be empty.' : undefined)
    });
    if (name) {
        store.createFolder(name.trim(), item.folder.id);
    }
}

/** Reparents an existing folder under a chosen parent (or back to the root), via a picker that excludes the folder itself, its descendants, and any parent that would exceed MAX_FOLDER_DEPTH. */
export async function moveFolderToParent(store: BookmarkStore, item: FolderGroupItem) {
    const parentId = await pickParentFolder(store, `Move "${item.folder.name}" to...`, item.folder.id);
    if (parentId === undefined) {
        return;
    }
    store.moveFolderToParent(item.folder.id, parentId);
}

export async function renameFolder(store: BookmarkStore, item: FolderGroupItem) {
    const name = await vscode.window.showInputBox({
        prompt: 'Rename bookmark folder',
        value: item.folder.name,
        validateInput: value => (value.trim().length === 0 ? 'Folder name cannot be empty.' : undefined)
    });
    if (name) {
        store.renameFolder(item.folder.id, name.trim());
    }
}

export async function renameBookmark(store: BookmarkStore, item: BookmarkTreeItem) {
    const label = await vscode.window.showInputBox({
        prompt: 'Rename bookmark',
        value: item.bookmark.label,
        validateInput: value => (value.trim().length === 0 ? 'Bookmark label cannot be empty.' : undefined)
    });
    if (label) {
        store.renameBookmark(item.bookmark.id, label.trim());
    }
}

const ADD_NEW_TAG_PICK = '$(add) Add New Tag...';

/** Opens a multi-select quick-pick of existing tags (pre-checked to the bookmark's current ones), with a fallback input box to type a brand-new tag. */
export async function editBookmarkTags(store: BookmarkStore, item: BookmarkTreeItem): Promise<void> {
    const currentTags = new Set(item.bookmark.tags ?? []);
    const items: vscode.QuickPickItem[] = [
        ...store.getAllTags().map(tag => ({ label: tag, picked: currentTags.has(tag) })),
        { label: ADD_NEW_TAG_PICK }
    ];

    const picked = await vscode.window.showQuickPick(items, {
        placeHolder: `Tags for "${item.bookmark.label}"`,
        canPickMany: true
    });
    if (!picked) {
        return;
    }

    const tags = picked.map(p => p.label).filter(label => label !== ADD_NEW_TAG_PICK);

    if (picked.some(p => p.label === ADD_NEW_TAG_PICK)) {
        const newTag = await vscode.window.showInputBox({
            prompt: 'New tag name',
            validateInput: value => (value.trim().length === 0 ? 'Tag name cannot be empty.' : undefined)
        });
        if (newTag) {
            tags.push(newTag.trim());
        }
    }

    store.setBookmarkTags(item.bookmark.id, [...new Set(tags)]);
}

/** Prompts for a tag to filter the tree by (or to clear the active filter). No-ops with a message if no tags exist yet. */
export async function filterByTag(store: BookmarkStore, provider: BookmarksTreeProvider): Promise<void> {
    const tags = store.getAllTags();
    if (tags.length === 0) {
        vscode.window.showInformationMessage('No tags yet — tag a bookmark first.');
        return;
    }

    const CLEAR_FILTER_PICK = '$(clear-all) Clear Filter';
    const items = provider.getTagFilter() ? [CLEAR_FILTER_PICK, ...tags] : tags;
    const picked = await vscode.window.showQuickPick(items, { placeHolder: 'Filter bookmarks by tag' });
    if (picked === undefined) {
        return;
    }
    provider.setTagFilter(picked === CLEAR_FILTER_PICK ? null : picked);
}

/**
 * Opens a live search box that narrows the tree as the user types (label, relative path, or repo
 * name). Enter keeps the current filter active and closes the box; Escape (or any other dismissal
 * without accepting) clears it. Returns the input box so tests can drive it without a real UI.
 */
export function filterBookmarks(provider: BookmarksTreeProvider): vscode.InputBox {
    const inputBox = vscode.window.createInputBox();
    inputBox.placeholder = 'Filter bookmarks by name, path, or repo';
    inputBox.value = provider.getSearchFilter() ?? '';

    let accepted = false;
    inputBox.onDidChangeValue(value => provider.setSearchFilter(value));
    inputBox.onDidAccept(() => {
        accepted = true;
        inputBox.hide();
    });
    inputBox.onDidHide(() => {
        if (!accepted) {
            provider.setSearchFilter(null);
        }
        inputBox.dispose();
    });

    inputBox.show();
    return inputBox;
}

export async function deleteFolder(store: BookmarkStore, item: FolderGroupItem) {
    if (item.bookmarks.length > 0 || item.childFolders.length > 0) {
        const parts: string[] = [];
        if (item.bookmarks.length > 0) {
            parts.push(`${item.bookmarks.length} bookmark(s) will move to the root list`);
        }
        if (item.childFolders.length > 0) {
            parts.push(`${item.childFolders.length} subfolder(s) will move to the root`);
        }
        const confirm = await vscode.window.showWarningMessage(
            `Delete folder "${item.folder.name}"? ${parts.join(' and ')}.`,
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
export async function pickFolder(store: BookmarkStore, placeHolder: string): Promise<string | null | undefined> {
    const folders = store.getAllFolders();
    const breadcrumbById = new Map(folders.map(f => [f.id, folderBreadcrumb(folders, f.id)]));
    const picked = await vscode.window.showQuickPick(
        [NO_FOLDER_PICK, ...folders.map(f => breadcrumbById.get(f.id) as string), NEW_FOLDER_PICK],
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

    return folders.find(f => breadcrumbById.get(f.id) === picked)?.id ?? undefined;
}

const NO_PARENT_PICK = '$(circle-slash) No Parent (root)';

/** Prompts the user to choose a parent folder for another folder. Returns `undefined` if cancelled, `null` for root. `excludeFolderId` excludes that folder and its descendants (for reparenting), and folders where nesting would exceed MAX_FOLDER_DEPTH are left out entirely. */
export async function pickParentFolder(store: BookmarkStore, placeHolder: string, excludeFolderId?: string): Promise<string | null | undefined> {
    const eligible = eligibleParentFolders(store, { excludeFolderId });
    const allFolders = store.getAllFolders();
    const breadcrumbById = new Map(eligible.map(f => [f.id, folderBreadcrumb(allFolders, f.id)]));

    const picked = await vscode.window.showQuickPick([NO_PARENT_PICK, ...eligible.map(f => breadcrumbById.get(f.id) as string)], {
        placeHolder
    });
    if (!picked) {
        return undefined;
    }
    if (picked === NO_PARENT_PICK) {
        return null;
    }
    return eligible.find(f => breadcrumbById.get(f.id) === picked)?.id ?? undefined;
}

/**
 * Handles a folder dropped onto `target`: dropping onto another folder always nests the dragged
 * folder as that folder's last child (moving folders can't be reordered onto each other the way
 * bookmarks are — there's no way to tell "reorder before" from "nest into" from a single drop
 * target, so nesting wins since it's the primary reason to drag a folder here). A no-op message
 * is shown if nesting there would exceed MAX_FOLDER_DEPTH or create a cycle. Dropping on empty
 * space moves the folder to the root and appends it at the end of the root-level list.
 */
export function dropFolder(store: BookmarkStore, draggedId: string, target: TreeNode | undefined) {
    const folders = store.getAllFolders();
    const dragged = folders.find(f => f.id === draggedId);
    if (!dragged) {
        return;
    }

    if (target instanceof BookmarkTreeItem) {
        return;
    }

    if (target instanceof FolderGroupItem) {
        if (target.folder.id === draggedId || isDescendantFolder(folders, draggedId, target.folder.id)) {
            return;
        }
        const height = folderSubtreeHeight(folders, draggedId);
        if (!canNestUnder(folders, target.folder.id, height)) {
            vscode.window.showWarningMessage(`Can't nest "${dragged.name}" there — maximum folder depth (${MAX_FOLDER_DEPTH}) reached.`);
            return;
        }
        if ((dragged.parentId ?? null) !== target.folder.id) {
            store.moveFolderToParent(draggedId, target.folder.id);
        }
        const scope = store.getAllFolders().filter(f => (f.parentId ?? null) === target.folder.id);
        store.reorderFolders(computeReorderedIds(scope, draggedId, null, folderFallbackCompare));
        return;
    }

    if ((dragged.parentId ?? null) !== null) {
        store.moveFolderToParent(draggedId, null);
    }
    const scope = store.getAllFolders().filter(f => (f.parentId ?? null) === null);
    store.reorderFolders(computeReorderedIds(scope, draggedId, null, folderFallbackCompare));
}

/**
 * Handles a bookmark dropped onto `target`: dropping onto a folder moves the bookmark into it
 * (appended at the end); dropping onto another bookmark reorders within that bookmark's scope,
 * moving folders too in tree view (list view reorders in place without touching folderId);
 * dropping on empty space appends to the end of the root/list scope.
 */
export function dropBookmark(store: BookmarkStore, draggedId: string, target: TreeNode | undefined, viewMode: ViewMode) {
    const dragged = store.getAllBookmarks().find(b => b.id === draggedId);
    if (!dragged) {
        return;
    }

    if (target instanceof FolderGroupItem) {
        if (dragged.folderId !== target.folder.id) {
            store.moveBookmarkToFolder(draggedId, target.folder.id);
        }
        const scope = store.getAllBookmarks().filter(b => b.folderId === target.folder.id);
        store.reorderBookmarks(computeReorderedIds(scope, draggedId, null, bookmarkFallbackCompare));
        return;
    }

    if (target instanceof BookmarkTreeItem && target.bookmark.id === draggedId) {
        return;
    }

    const beforeId = target instanceof BookmarkTreeItem ? target.bookmark.id : null;
    // List view is a flat scope: reorder in place without ever reassigning folderId.
    const destinationFolderId =
        viewMode === 'list' ? dragged.folderId : target instanceof BookmarkTreeItem ? target.bookmark.folderId : null;

    if (destinationFolderId !== dragged.folderId) {
        store.moveBookmarkToFolder(draggedId, destinationFolderId);
    }

    const scope = store.getAllBookmarks().filter(b => (viewMode === 'list' ? true : b.folderId === destinationFolderId));
    store.reorderBookmarks(computeReorderedIds(scope, draggedId, beforeId, bookmarkFallbackCompare));
}

export async function moveToFolder(store: BookmarkStore, item: BookmarkTreeItem) {
    const folderId = await pickFolder(store, `Move "${item.bookmark.label}" to...`);
    if (folderId === undefined) {
        return;
    }
    store.moveBookmarkToFolder(item.bookmark.id, folderId);
}

export async function addBookmarksToFolder(store: BookmarkStore, uri: vscode.Uri | undefined, uris: vscode.Uri[] | undefined) {
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
