const { getDefaultConfig } = require('expo/metro-config');
const { withNativewind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

module.exports = withNativewind(config, {
  input: './src/global.css',
  inlineRem: 16,
  inlineVariables: {
    exclude: [
      '--primary',
      '--primary-foreground',
      '--background',
      '--foreground',
      '--card',
      '--card-foreground',
      '--popover',
      '--popover-foreground',
      '--secondary',
      '--secondary-foreground',
      '--accent',
      '--accent-foreground',
      '--muted',
      '--muted-foreground',
      '--border',
      '--input',
      '--ring',
      '--destructive',
      '--destructive-foreground',
      '--success',
      '--success-foreground',
      '--warning',
      '--warning-foreground',
      '--info',
      '--info-foreground',
    ],
  },
});
