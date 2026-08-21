// Minimal stand-in for the 'vscode' module, covering only the surface that
// extension.ts actually touches at runtime. Not a general-purpose vscode
// mock — extend it if tests start exercising more.
import { vi } from 'vitest';

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

export class Uri {
    private constructor(public readonly fsPath: string, private readonly raw: string) {}

    static parse(value: string): Uri {
        return new Uri(value.replace(/^file:\/\//, ''), value);
    }

    static file(path: string): Uri {
        return new Uri(path, `file://${path}`);
    }

    toString() {
        return this.raw;
    }
}

export const TreeItemCollapsibleState = { None: 0, Collapsed: 1, Expanded: 2 };

export class TreeItem {
    contextValue?: string;
    iconPath?: unknown;
    description?: string;
    tooltip?: string;
    command?: unknown;

    constructor(public label?: unknown, public collapsibleState?: unknown) {}
}

export class ThemeIcon {
    constructor(public id: string) {}
}

export const window = {
    activeTextEditor: undefined as { document: { uri: Uri } } | undefined,
    showInformationMessage: vi.fn(),
    showWarningMessage: vi.fn(),
    showErrorMessage: vi.fn(),
    showInputBox: vi.fn(),
    showQuickPick: vi.fn(),
    showTextDocument: vi.fn(),
    createTreeView: vi.fn(() => ({ dispose: () => {} }))
};

export const workspace = {
    workspaceFolders: undefined as Array<{ name: string; uri: Uri }> | undefined,
    getWorkspaceFolder: vi.fn(),
    asRelativePath: vi.fn((uri: Uri) => uri.fsPath),
    openTextDocument: vi.fn()
};

export const commands = {
    registerCommand: vi.fn(() => ({ dispose: () => {} })),
    executeCommand: vi.fn()
};
