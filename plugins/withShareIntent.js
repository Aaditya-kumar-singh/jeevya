const { withAndroidManifest, withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const ACTIVITY_CLASS = '.share.JeevyaShareReceiverActivity';

module.exports = function withShareIntent(config) {
  config = withAndroidManifest(config, (mod) => {
    const application = mod.modResults.manifest.application?.[0];
    if (!application) return mod;
    application.activity = application.activity || [];
    const exists = application.activity.some((activity) => activity.$?.['android:name'] === ACTIVITY_CLASS);
    if (!exists) {
      application.activity.push({
        $: {
          'android:name': ACTIVITY_CLASS,
          'android:exported': 'true',
          'android:theme': '@android:style/Theme.Translucent.NoTitleBar',
        },
        'intent-filter': [
          {
            action: [{ $: { 'android:name': 'android.intent.action.SEND' } }],
            category: [{ $: { 'android:name': 'android.intent.category.DEFAULT' } }],
            data: [
              { $: { 'android:mimeType': 'text/plain' } },
              { $: { 'android:mimeType': 'text/*' } },
              { $: { 'android:mimeType': 'image/*' } },
              { $: { 'android:mimeType': 'application/pdf' } },
            ],
          },
        ],
      });
    }
    return mod;
  });

  return withDangerousMod(config, ['android', async (mod) => {
    const pkg = mod.android?.package || 'com.aaditya001.personalityimprovementapp';
    const packagePath = pkg.replace(/\\./g, path.sep);
    const targetDir = path.join(mod.modRequest.platformProjectRoot, 'app', 'src', 'main', 'java', packagePath, 'share');
    fs.mkdirSync(targetDir, { recursive: true });
    const source = fs.readFileSync(path.join(__dirname, 'share', 'JeevyaShareReceiverActivity.java'), 'utf8');
    fs.writeFileSync(path.join(targetDir, 'JeevyaShareReceiverActivity.java',), source.replace('package com.aaditya001.personalityimprovementapp.share;', `package ${pkg}.share;`));
    return mod;
  }]);
};
