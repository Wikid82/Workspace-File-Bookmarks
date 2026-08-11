# Workspace File Bookmarks

A VS Code extension for bookmarking files across multi-root, multi-repo workspaces so you can jump straight back to the ones you use most.

## Features

- Bookmark the active file from the editor title bar, the command palette, or right-click in the Explorer — including multi-select (bookmark several files at once).
- Organize bookmarks into your own folders: create, rename, delete, and move bookmarks between them via right-click "Move to Folder...".
- Right-click a bookmark folder to open every file inside it at once.
- Toggle the sidebar between tree view (grouped by folder) and flat list view via the view title bar.
- Click a bookmark to open it; hover to reveal a remove button.
- In multi-root workspaces, each bookmark's repository/workspace folder is shown alongside its path.
- Bookmarks persist per-workspace (stored in VS Code's workspace state) so they survive reloads.

## Development

```bash
npm install
npm run build     # bundle extension.ts -> dist/extension.cjs
npm run watch      # rebuild on change
npm run lint       # type-check only
```

Press `F5` in VS Code to launch an Extension Development Host with the extension loaded.

## Packaging / local install

```bash
npm run package    # builds, packages a .vsix, and installs it into VS Code / Insiders if present
```

## Roadmap

Once basic bookmarking is solid: renaming/tagging bookmarks, reordering, and marketplace publishing.
