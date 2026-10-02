const { withAndroidManifest, withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const SERVICE_CLASS = '.payment.JeevyaPaymentNotificationListener';

module.exports = function withPaymentNotificationListener(config) {
  config = withAndroidManifest(config, (mod) => {
    const application = mod.modResults.manifest.application?.[0];
    if (!application) return mod;
    application.service = application.service || [];
    const exists = application.service.some((service) => service.$?.['android:name'] === SERVICE_CLASS);
    if (!exists) {
      application.service.push({
        $: {
          'android:name': SERVICE_CLASS,
          'android:label': 'Jeevya Payment Tracker',
          'android:exported': 'false',
          'android:permission': 'android.permission.BIND_NOTIFICATION_LISTENER_SERVICE',
        },
        'intent-filter': [{ action: [{ $: { 'android:name': 'android.service.notification.NotificationListenerService' } }] }],
      });
    }
    return mod;
  });

  return withDangerousMod(config, ['android', async (mod) => {
    const pkg = mod.android?.package || 'com.aaditya001.personalityimprovementapp';
    const packagePath = pkg.replace(/\./g, path.sep);
    const targetDir = path.join(mod.modRequest.platformProjectRoot, 'app', 'src', 'main', 'java', packagePath, 'payment');
    fs.mkdirSync(targetDir, { recursive: true });
    const source = fs.readFileSync(path.join(__dirname, 'payment', 'JeevyaPaymentNotificationListener.java'), 'utf8');
    fs.writeFileSync(path.join(targetDir, 'JeevyaPaymentNotificationListener.java'), source.replace('package com.aaditya001.personalityimprovementapp.payment;', `package ${pkg}.payment;`));
    return mod;
  }]);
};