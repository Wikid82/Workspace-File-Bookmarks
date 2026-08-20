// Minimal stand-in for the 'vscode' module, covering only the surface that
// BookmarkStore (the code under test) actually touches at runtime. Not a
// general-purpose vscode mock — extend it if tests start exercising more.

export class EventEmitter<T> {
    private listeners: Array<(e: T) => void> = [];

    event = (listener: (e: T) => void) => {
        this.listeners.push(listener);
        return { dispose: () => {} };
    };

    fire(data: T) {
        for (const listener of this.listeners) {
            listener(data);
        }
    }
}

export const window = {
    showInformationMessage: (..._args: unknown[]) => {},
    showWarningMessage: (..._args: unknown[]) => {}
};

// Referenced only at class-definition time (extends/enum access) when the
// whole extension.ts module loads for testing — never actually exercised by
// BookmarkStore/describeBookmark, so these stay stubs.
export const TreeItemCollapsibleState = { None: 0, Collapsed: 1, Expanded: 2 };

export class TreeItem {
    constructor(public label?: unknown, public collapsibleState?: unknown) {}
}

export class ThemeIcon {
    constructor(public id: string) {}
}
