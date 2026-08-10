import { GeneratedFile } from '../types';

export const INITIAL_EXTENSION_FILES: GeneratedFile[] = [
  {
    path: 'package.json',
    language: 'json',
    description: 'Extension manifest file defining commands, sidebar tree view contributions, and configuration settings.',
    content: `{
  "name": "multirepo-workspace-bookmarks",
  "displayName": "Workspace Multi-Repo Bookmarks",
  "description": "Bookmark files and line numbers across multi-repo VS Code workspaces, sorted by repository or organized in custom nested folders.",
  "version": "1.0.0",
  "publisher": "developer-tools",
  "engines": {
    "vscode": "^1.80.0"
  },
  "categories": [
    "Other",
    "Formatters",
    "Productivity"
  ],
  "activationEvents": [
    "onView:workspace-bookmarks-view"
  ],
  "main": "./dist/extension.js",
  "contributes": {
    "viewsContainers": {
      "activitybar": [
        {
          "id": "workspace-bookmarks-container",
          "title": "Workspace Bookmarks",
          "icon": "$(bookmark)"
        }
      ]
    },
    "views": {
      "workspace-bookmarks-container": [
        {
          "id": "workspace-bookmarks-view",
          "name": "Multi-Repo Bookmarks",
          "icon": "$(bookmark)",
          "contextualTitle": "Workspace Multi-Repo Bookmarks"
        }
      ]
    },
    "commands": [
      {
        "command": "workspaceBookmarks.addBookmark",
        "title": "Bookmark Active File",
        "category": "Bookmarks",
        "icon": "$(bookmark)"
      },
      {
        "command": "workspaceBookmarks.addBookmarkLine",
        "title": "Bookmark Line Number",
        "category": "Bookmarks",
        "icon": "$(pin)"
      },
      {
        "command": "workspaceBookmarks.createFolder",
        "title": "Create Folder...",
        "category": "Bookmarks",
        "icon": "$(new-folder)"
      },
      {
        "command": "workspaceBookmarks.setSortByRepo",
        "title": "Group & Sort by Repository",
        "category": "Bookmarks",
        "icon": "$(repo)"
      },
      {
        "command": "workspaceBookmarks.setSortByFolder",
        "title": "Organize by Custom Folders",
        "category": "Bookmarks",
        "icon": "$(folder)"
      },
      {
        "command": "workspaceBookmarks.setSortFlat",
        "title": "Flat List View",
        "category": "Bookmarks",
        "icon": "$(list-flat)"
      },
      {
        "command": "workspaceBookmarks.removeBookmark",
        "title": "Remove Bookmark",
        "category": "Bookmarks",
        "icon": "$(trash)"
      },
      {
        "command": "workspaceBookmarks.exportConfig",
        "title": "Export Bookmarks to Workspace JSON",
        "category": "Bookmarks",
        "icon": "$(export)"
      }
    ],
    "menus": {
      "view/title": [
        {
          "command": "workspaceBookmarks.addBookmark",
          "group": "navigation@1"
        },
        {
          "command": "workspaceBookmarks.createFolder",
          "group": "navigation@2"
        },
        {
          "command": "workspaceBookmarks.setSortByRepo",
          "group": "grouping@1"
        },
        {
          "command": "workspaceBookmarks.setSortByFolder",
          "group": "grouping@2"
        }
      ],
      "view/item/context": [
        {
          "command": "workspaceBookmarks.removeBookmark",
          "when": "viewItem == bookmarkItem",
          "group": "inline"
        }
      ],
      "editor/context": [
        {
          "command": "workspaceBookmarks.addBookmark",
          "group": "bookmarking"
        },
        {
          "command": "workspaceBookmarks.addBookmarkLine",
          "group": "bookmarking"
        }
      ]
    },
    "configuration": {
      "title": "Workspace Multi-Repo Bookmarks",
      "properties": {
        "workspaceBookmarks.defaultSortMode": {
          "type": "string",
          "enum": ["by-repo", "custom-folders", "flat-list"],
          "default": "by-repo",
          "description": "Default view mode for organizing workspace bookmarks."
        },
        "workspaceBookmarks.showRepoBadges": {
          "type": "boolean",
          "default": true,
          "description": "Show repository name badges next to file bookmarks."
        }
      }
    }
  },
  "scripts": {
    "vscode:prepublish": "npm run compile",
    "compile": "tsc -p ./",
    "watch": "tsc -watch -p ./",
    "package": "vsce package"
  },
  "devDependencies": {
    "@types/node": "^18.0.0",
    "@types/vscode": "^1.80.0",
    "typescript": "^5.0.0",
    "@vscode/vsce": "^2.19.0"
  }
}`
  },
  {
    path: 'src/extension.ts',
    language: 'typescript',
    description: 'Main VS Code extension entry point registering tree view providers, commands, and workspace listeners.',
    content: `import * as vscode from 'vscode';
import { BookmarkTreeProvider } from './bookmarkTreeProvider';
import { BookmarkManager } from './bookmarkManager';

export function activate(context: vscode.ExtensionContext) {
  const manager = new BookmarkManager(context);
  const treeProvider = new BookmarkTreeProvider(manager);

  const treeView = vscode.window.createTreeView('workspace-bookmarks-view', {
    treeDataProvider: treeProvider,
    showCollapseAll: true,
    canSelectMany: true,
    dragAndDropController: treeProvider
  });

  // Register Commands
  context.subscriptions.push(
    vscode.commands.registerCommand('workspaceBookmarks.addBookmark', async () => {
      const activeEditor = vscode.window.activeTextEditor;
      if (!activeEditor) {
        vscode.window.showInformationMessage('No active editor open to bookmark.');
        return;
      }
      const uri = activeEditor.document.uri;
      const selection = activeEditor.selection;
      const line = selection.active.line + 1;
      const lineText = activeEditor.document.lineAt(selection.active.line).text.trim();

      const note = await vscode.window.showInputBox({
        prompt: 'Optional note / alias for this bookmark',
        placeHolder: 'e.g. Auth Token check in Sprint 44'
      });

      await manager.addBookmark(uri, line, lineText, note);
      treeProvider.refresh();
      vscode.window.showInformationMessage('File bookmarked in workspace!');
    }),

    vscode.commands.registerCommand('workspaceBookmarks.createFolder', async () => {
      const folderName = await vscode.window.showInputBox({
        prompt: 'Enter Custom Folder Name',
        placeHolder: 'e.g. 🔥 Sprint Focus, 💳 Payment Logic'
      });
      if (folderName) {
        await manager.createFolder(folderName);
        treeProvider.refresh();
      }
    }),

    vscode.commands.registerCommand('workspaceBookmarks.setSortByRepo', () => {
      manager.setSortMode('by-repo');
      treeProvider.refresh();
    }),

    vscode.commands.registerCommand('workspaceBookmarks.setSortByFolder', () => {
      manager.setSortMode('custom-folders');
      treeProvider.refresh();
    }),

    vscode.commands.registerCommand('workspaceBookmarks.removeBookmark', async (item) => {
      if (item && item.bookmarkId) {
        await manager.removeBookmark(item.bookmarkId);
        treeProvider.refresh();
      }
    }),

    vscode.commands.registerCommand('workspaceBookmarks.exportConfig', async () => {
      await manager.exportToWorkspaceJson();
    })
  );

  // Listen for workspace folder changes (Adding/Removing Repos in workspace)
  vscode.workspace.onDidChangeWorkspaceFolders(() => {
    treeProvider.refresh();
  });
}

export function deactivate() {}`
  },
  {
    path: 'src/bookmarkTreeProvider.ts',
    language: 'typescript',
    description: 'TreeDataProvider handling Multi-Repo grouping, Custom Folder nesting, search filter, and drag & drop.',
    content: `import * as vscode from 'vscode';
import { BookmarkManager, BookmarkItemData, FolderData } from './bookmarkManager';
import * as path from 'path';

export class BookmarkTreeItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly type: 'repo' | 'folder' | 'bookmark',
    public readonly bookmarkId?: string,
    public readonly folderId?: string,
    public readonly repoPath?: string
  ) {
    super(label, collapsibleState);
    this.contextValue = type === 'bookmark' ? 'bookmarkItem' : type === 'folder' ? 'folderItem' : 'repoItem';

    if (type === 'repo') {
      this.iconPath = new vscode.ThemeIcon('repo');
    } else if (type === 'folder') {
      this.iconPath = new vscode.ThemeIcon('folder');
    } else {
      this.iconPath = new vscode.ThemeIcon('bookmark');
    }
  }
}

export class BookmarkTreeProvider implements vscode.TreeDataProvider<BookmarkTreeItem>, vscode.TreeDragAndDropController<BookmarkTreeItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<BookmarkTreeItem | undefined | void> = new vscode.EventEmitter<BookmarkTreeItem | undefined | void>();
  readonly onDidChangeTreeData: vscode.Event<BookmarkTreeItem | undefined | void> = this._onDidChangeTreeData.event;

  dropMimeTypes = ['application/vnd.code.tree.workspace-bookmarks'];
  dragMimeTypes = ['application/vnd.code.tree.workspace-bookmarks'];

  constructor(private manager: BookmarkManager) {}

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: BookmarkTreeItem): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: BookmarkTreeItem): Promise<BookmarkTreeItem[]> {
    const sortMode = this.manager.getSortMode();
    const bookmarks = this.manager.getBookmarks();
    const folders = this.manager.getFolders();
    const workspaceFolders = vscode.workspace.workspaceFolders || [];

    if (!element) {
      // Root items rendering depending on sort mode
      if (sortMode === 'by-repo') {
        // Group by workspace repository folders
        return workspaceFolders.map(wf => {
          const repoBookmarks = bookmarks.filter(b => b.fsPath.startsWith(wf.uri.fsPath));
          const count = repoBookmarks.length;
          const item = new BookmarkTreeItem(
            \`\${wf.name} (\${count})\`,
            vscode.TreeItemCollapsibleState.Expanded,
            'repo',
            undefined,
            undefined,
            wf.uri.fsPath
          );
          item.description = wf.uri.fsPath;
          return item;
        });
      } else if (sortMode === 'custom-folders') {
        // Show custom folders at root + unassigned bookmarks
        const rootFolders = folders.filter(f => !f.parentId);
        const folderItems = rootFolders.map(f => new BookmarkTreeItem(
          f.name,
          vscode.TreeItemCollapsibleState.Expanded,
          'folder',
          undefined,
          f.id
        ));

        const unassigned = bookmarks.filter(b => !b.folderId);
        const bookmarkItems = unassigned.map(b => this.createBookmarkTreeItem(b));
        return [...folderItems, ...bookmarkItems];
      } else {
        // Flat list
        return bookmarks.map(b => this.createBookmarkTreeItem(b));
      }
    }

    if (element.type === 'repo' && element.repoPath) {
      const repoBookmarks = bookmarks.filter(b => b.fsPath.startsWith(element.repoPath!));
      return repoBookmarks.map(b => this.createBookmarkTreeItem(b));
    }

    if (element.type === 'folder' && element.folderId) {
      const childBookmarks = bookmarks.filter(b => b.folderId === element.folderId);
      return childBookmarks.map(b => this.createBookmarkTreeItem(b));
    }

    return [];
  }

  private createBookmarkTreeItem(b: BookmarkItemData): BookmarkTreeItem {
    const fileName = path.basename(b.fsPath);
    const label = b.title ? \`\${b.title} (\${fileName})\` : fileName;
    const item = new BookmarkTreeItem(
      label,
      vscode.TreeItemCollapsibleState.None,
      'bookmark',
      b.id
    );

    item.description = b.lineNumber ? \`Line \${b.lineNumber}\` : b.relativePath;
    item.tooltip = \`\${b.fsPath}\${b.notes ? \`\\nNote: \${b.notes}\` : ''}\`;
    item.command = {
      command: 'vscode.open',
      title: 'Open File',
      arguments: [
        vscode.Uri.file(b.fsPath),
        {
          selection: b.lineNumber ? new vscode.Range(b.lineNumber - 1, 0, b.lineNumber - 1, 0) : undefined
        }
      ]
    };

    return item;
  }

  // Drag and drop implementation for custom folder organizing
  public async handleDrag(source: readonly BookmarkTreeItem[], treeDataTransfer: vscode.DataTransfer): Promise<void> {
    treeDataTransfer.set('application/vnd.code.tree.workspace-bookmarks', new vscode.DataTransferItem(source));
  }

  public async handleDrop(target: BookmarkTreeItem | undefined, sources: vscode.DataTransfer): Promise<void> {
    const transferItem = sources.get('application/vnd.code.tree.workspace-bookmarks');
    if (!transferItem) return;
    const items: BookmarkTreeItem[] = transferItem.value;

    for (const item of items) {
      if (item.bookmarkId && target && target.type === 'folder' && target.folderId) {
        await this.manager.moveBookmarkToFolder(item.bookmarkId, target.folderId);
      }
    }
    this.refresh();
  }
}`
  },
  {
    path: 'src/bookmarkManager.ts',
    language: 'typescript',
    description: 'Manages workspace storage, multi-repo URI resolution, and config synchronization.',
    content: `import * as vscode from 'vscode';
import * as path from 'path';

export interface BookmarkItemData {
  id: string;
  fsPath: string;
  relativePath: string;
  repoName: string;
  lineNumber?: number;
  lineContent?: string;
  title?: string;
  notes?: string;
  folderId?: string;
  createdAt: number;
}

export interface FolderData {
  id: string;
  name: string;
  parentId?: string;
}

export class BookmarkManager {
  private STORAGE_KEY = 'workspace_multi_repo_bookmarks_v1';
  private FOLDERS_KEY = 'workspace_custom_folders_v1';
  private SORT_MODE_KEY = 'workspace_bookmarks_sort_mode';

  constructor(private context: vscode.ExtensionContext) {}

  public getBookmarks(): BookmarkItemData[] {
    return this.context.workspaceState.get<BookmarkItemData[]>(this.STORAGE_KEY, []);
  }

  public getFolders(): FolderData[] {
    return this.context.workspaceState.get<FolderData[]>(this.FOLDERS_KEY, []);
  }

  public getSortMode(): 'by-repo' | 'custom-folders' | 'flat-list' {
    return this.context.workspaceState.get(this.SORT_MODE_KEY, 'by-repo');
  }

  public async setSortMode(mode: 'by-repo' | 'custom-folders' | 'flat-list'): Promise<void> {
    await this.context.workspaceState.update(this.SORT_MODE_KEY, mode);
  }

  public async addBookmark(uri: vscode.Uri, lineNumber?: number, lineContent?: string, notes?: string): Promise<void> {
    const bookmarks = this.getBookmarks();
    const wf = vscode.workspace.getWorkspaceFolder(uri);
    const repoName = wf ? wf.name : 'external';
    const relativePath = wf ? path.relative(wf.uri.fsPath, uri.fsPath) : uri.fsPath;

    const newBookmark: BookmarkItemData = {
      id: \`bm_\${Date.now()}_\${Math.random().toString(36).substr(2, 5)}\`,
      fsPath: uri.fsPath,
      relativePath,
      repoName,
      lineNumber,
      lineContent,
      notes,
      createdAt: Date.now()
    };

    bookmarks.unshift(newBookmark);
    await this.context.workspaceState.update(this.STORAGE_KEY, bookmarks);
  }

  public async createFolder(name: string): Promise<FolderData> {
    const folders = this.getFolders();
    const newFolder: FolderData = {
      id: \`folder_\${Date.now()}\`,
      name
    };
    folders.push(newFolder);
    await this.context.workspaceState.update(this.FOLDERS_KEY, folders);
    return newFolder;
  }

  public async moveBookmarkToFolder(bookmarkId: string, folderId: string): Promise<void> {
    const bookmarks = this.getBookmarks();
    const item = bookmarks.find(b => b.id === bookmarkId);
    if (item) {
      item.folderId = folderId;
      await this.context.workspaceState.update(this.STORAGE_KEY, bookmarks);
    }
  }

  public async removeBookmark(id: string): Promise<void> {
    const bookmarks = this.getBookmarks().filter(b => b.id !== id);
    await this.context.workspaceState.update(this.STORAGE_KEY, bookmarks);
  }

  public async exportToWorkspaceJson(): Promise<void> {
    if (!vscode.workspace.workspaceFolders || vscode.workspace.workspaceFolders.length === 0) {
      vscode.window.showErrorMessage('No workspace open to save config.');
      return;
    }
    const rootPath = vscode.workspace.workspaceFolders[0].uri.fsPath;
    const configPath = path.join(rootPath, '.vscode', 'bookmarks.json');

    const data = {
      bookmarks: this.getBookmarks(),
      folders: this.getFolders()
    };

    const uri = vscode.Uri.file(configPath);
    const content = Buffer.from(JSON.stringify(data, null, 2), 'utf8');
    await vscode.workspace.fs.writeFile(uri, content);
    vscode.window.showInformationMessage(\`Exported bookmarks to \${configPath}\`);
  }
}`
  },
  {
    path: 'README.md',
    language: 'markdown',
    description: 'Documentation for compiling, packaging, and installing the extension in VS Code.',
    content: `# Workspace Multi-Repo Bookmarks for VS Code

A powerful VS Code extension designed specifically for **multi-repository workspaces**, solving the limitation of traditional bookmark plugins by allowing you to **Sort & Group by Repository** or organize files in **Custom Folder Hierarchies**.

## 🌟 Key Features
- 🗂️ **Multi-Repo Sorting**: Automatically groups file bookmarks under their respective repository root folder (\`storefront-web\`, \`payment-service\`, etc.).
- 📁 **Custom Virtual Folders**: Create custom folders (e.g., \`🔥 Sprint Focus\`, \`🐛 Auth Bug Fixes\`) and drag & drop file bookmarks into them.
- 📌 **Line & Code Notes**: Bookmark specific line numbers and attach notes or aliases.
- 💾 **Git Workspace Sync**: Export bookmarks to \`.vscode/bookmarks.json\` so team members sharing the workspace see the same organized file structure.

---

## 🚀 Quick Setup & Installation

### Option 1: Test in VS Code Extension Host
1. Open this extension folder in **VS Code**.
2. Press \`F5\` to start debugging.
3. A new **[Extension Development Host]** VS Code window will open with the extension active!

### Option 2: Package & Install Locally
1. Make sure you have \`vsce\` installed globally:
   \`\`\`bash
   npm install -g @vscode/vsce
   \`\`\`
2. Install dependencies & build:
   \`\`\`bash
   npm install
   npm run compile
   \`\`\`
3. Package into a \`.vsix\` file:
   \`\`\`bash
   vsce package
   \`\`\`
4. Install in your daily VS Code:
   \`\`\`bash
   code --install-extension multirepo-workspace-bookmarks-1.0.0.vsix
   \`\`\`

---

## ⚡ Usage
- **Bookmark File**: Right-click inside any file or editor tab -> select **"Bookmark Active File"**.
- **Switch Grouping Mode**: Use the toolbar icons at the top of the **Multi-Repo Bookmarks** sidebar view to toggle between **Group by Repository** and **Custom Folders**.
`
  },
  {
    path: 'tsconfig.json',
    language: 'json',
    description: 'TypeScript compiler configuration for VS Code Extension API.',
    content: `{
  "compilerOptions": {
    "module": "commonjs",
    "target": "ES2020",
    "outDir": "dist",
    "rootDir": "src",
    "sourceMap": true,
    "strict": true
  },
  "exclude": ["node_modules", "dist"]
}`
  }
];
