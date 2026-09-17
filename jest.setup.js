const mockStore = new Map();

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: async (key) => mockStore.get(key) ?? null,
    setItem: async (key, value) => { mockStore.set(key, String(value)); },
    removeItem: async (key) => { mockStore.delete(key); },
    clear: async () => { mockStore.clear(); },
    getAllKeys: async () => Array.from(mockStore.keys()),
    multiGet: async (keys) => keys.map((key) => [key, mockStore.get(key) ?? null]),
    multiSet: async (pairs) => { pairs.forEach(([key, value]) => mockStore.set(key, String(value))); },
    multiRemove: async (keys) => { keys.forEach((key) => mockStore.delete(key)); },
  },
}));
