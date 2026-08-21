# Workspace File Bookmarks

<p style="text-align: center;">[![Version](https://vsmarketplacebadges.dev/version/Wikid82.workspace-file-bookmarks.svg?label=VS%20Code%20Marketplace)](https://marketplace.visualstudio.com/items?itemName=Wikid82.workspace-file-bookmarks)
[![Installs](https://vsmarketplacebadges.dev/installs-short/Wikid82.workspace-file-bookmarks.svg)](https://marketplace.visualstudio.com/items?itemName=Wikid82.workspace-file-bookmarks)
[![Rating](https://vsmarketplacebadges.dev/rating-short/Wikid82.workspace-file-bookmarks.svg)](https://marketplace.visualstudio.com/items?itemName=Wikid82.workspace-file-bookmarks)
[![License](https://img.shields.io/github/license/Wikid82/file_bookmarks)](LICENSE)</p>

Working across a multi-root or multi-repo workspace means the files you care about are scattered across folders you keep re-opening. **Workspace File Bookmarks** gives you one sidebar to pin the files you actually use — organized into your own folders, one click away, no matter which repo they live in.

<!--
TODO: add a screenshot or short GIF of the sidebar in action, save it as media/screenshot.png,
then uncomment the line below. This is the single biggest lever for Marketplace click-through —
listings with a visual convert far better than text-only ones.

![Workspace File Bookmarks sidebar showing bookmarked files grouped into folders](media/screenshot.png)
-->

## Features

- **Bookmark from anywhere** — the editor title bar, the command palette, or right-click in the Explorer, including multi-select to bookmark several files at once.
- **Organize into folders** — create, rename, delete, and move bookmarks between your own folders via right-click "Move to Folder...".
- **Open a whole folder at once** — right-click a bookmark folder to open every file inside it.
- **Tree or flat list** — toggle the sidebar view from the title bar to match how you think.
- **Multi-root aware** — each bookmark shows which repository/workspace folder it belongs to.
- **Persists per workspace** — bookmarks are stored in VS Code's workspace state, so they survive reloads.

## Installation

Search for **Workspace File Bookmarks** in the VS Code Extensions view, or install from the [Marketplace listing](https://marketplace.visualstudio.com/items?itemName=Wikid82.workspace-file-bookmarks).

## Feedback

This extension is early — I'm actively looking for feedback on what's useful and what's missing. If you hit a bug, want a feature, or just have thoughts, please [open an issue](https://github.com/Wikid82/file_bookmarks/issues). It genuinely helps shape what gets built next.

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

Renaming/tagging bookmarks, reordering, and drag-and-drop.
