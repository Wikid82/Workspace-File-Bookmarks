# Workspace File Bookmarks

A VS Code extension for bookmarking files across multi-root, multi-repo workspaces so you can jump straight back to the ones you use most.

## Features (v0.0.1)

- Bookmark the active file from the editor title bar, the command palette, or right-click in the Explorer.
- Bookmarks live in a dedicated sidebar (activity bar icon), grouped by repository/workspace folder when your workspace has more than one.
- Click a bookmark to open it; hover to reveal a remove button.
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
