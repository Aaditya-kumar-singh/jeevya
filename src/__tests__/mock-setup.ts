// @ts-nocheck
const mockStore = new Map();

// Use the real AsyncStorage web adapter for both test code and application code.
// Its web adapter requires window.localStorage, so provide one shared in-memory
// implementation before any application modules are imported. Module-resolution
// interception was removed because CommonJS require() and ESM import() could resolve
// different AsyncStorage instances under modern tsx, causing false integration failures.
const localStorage = {
  getItem: (key) => mockStore.get(key) ?? null,
  setItem: (key, value) => { mockStore.set(key, String(value)); },
  removeItem: (key) => { mockStore.delete(key); },
  clear: () => { mockStore.clear(); },
  get length() { return mockStore.size; },
  key: (index) => Array.from(mockStore.keys())[index] ?? null,
};
Object.defineProperty(globalThis, 'window', {
  configurable: true,
  writable: true,
  value: { localStorage },
});

