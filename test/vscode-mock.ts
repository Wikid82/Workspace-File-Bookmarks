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

export class DataTransferItem {
    constructor(private readonly value: string) {}

    asString(): Promise<string> {
        return Promise.resolve(this.value);
    }
}

export class DataTransfer {
    private readonly items = new Map<string, DataTransferItem>();

    set(mimeType: string, value: DataTransferItem) {
        this.items.set(mimeType, value);
    }

    get(mimeType: string): DataTransferItem | undefined {
        return this.items.get(mimeType);
    }
}

export class InputBox {
    placeholder = '';
    value = '';
    disposed = false;
    visible = false;

    private readonly changeEmitter = new EventEmitter<string>();
    private readonly acceptEmitter = new EventEmitter<void>();
    private readonly hideEmitter = new EventEmitter<void>();

    onDidChangeValue = this.changeEmitter.event;
    onDidAccept = this.acceptEmitter.event;
    onDidHide = this.hideEmitter.event;

    show() {
        this.visible = true;
    }

    hide() {
        this.visible = false;
        this.hideEmitter.fire();
    }

    dispose() {
        this.disposed = true;
    }

    /** Test helper: simulates the user typing, updating `value` and firing onDidChangeValue. */
    triggerChangeValue(value: string) {
        this.value = value;
        this.changeEmitter.fire(value);
    }

    /** Test helper: simulates pressing Enter. */
    triggerAccept() {
        this.acceptEmitter.fire();
    }
}

export const window = {
    activeTextEditor: undefined as { document: { uri: Uri } } | undefined,
    showInformationMessage: vi.fn(),
    showWarningMessage: vi.fn(),
    showErrorMessage: vi.fn(),
    showInputBox: vi.fn(),
    showQuickPick: vi.fn(),
    showTextDocument: vi.fn(),
    createTreeView: vi.fn(() => ({ dispose: () => {} })),
    createInputBox: vi.fn(() => new InputBox())
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
