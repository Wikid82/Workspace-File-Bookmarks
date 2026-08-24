// Fakes the slice of vscode.ExtensionContext that BookmarkStore reads/writes:
// workspaceState.get/update backed by a plain in-memory map.

export function createFakeContext() {
  const state = new Map<string, unknown>();
  return {
    workspaceState: {
      get<T>(key: string, defaultValue: T): T {
        return state.has(key) ? (state.get(key) as T) : defaultValue;
      },
      update(key: string, value: unknown) {
        state.set(key, value);
        return Promise.resolve();
      },
    },
  };
}
