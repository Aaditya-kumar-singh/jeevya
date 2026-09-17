// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*', 'node_modules/*', '.expo/*'],
  },
  {
    rules: {
      // These effects intentionally synchronize asynchronously loaded records
      // into editable form state. Hook-order and dependency rules remain strict.
      'react-hooks/set-state-in-effect': 'warn',
    },
  },
]);
