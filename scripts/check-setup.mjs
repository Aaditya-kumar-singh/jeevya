const store = new Map();
const localStorage = {
  getItem(key) { return store.get(String(key)) ?? null; },
  setItem(key, value) { store.set(String(key), String(value)); },
  removeItem(key) { store.delete(String(key)); },
  clear() { store.clear(); },
  key(index) { return Array.from(store.keys())[index] ?? null; },
  get length() { return store.size; },
};

Object.defineProperty(globalThis, 'window', {
  configurable: true,
  writable: true,
  value: { localStorage },
});
globalThis.document = {
  createElement: () => ({ style: {} }),
};
globalThis.__MOCK_STORE__ = store;
