const { withAndroidManifest } = require('@expo/config-plugins');

/**
 * Expo Config Plugin to inject Android permissions required by @notifee/react-native
 * for precise alarm scheduling and full-screen lock-screen intent.
 */
module.exports = function withNotifeePermissions(config) {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults.manifest;

    const permissions = [
      'android.permission.SCHEDULE_EXACT_ALARM',
      'android.permission.USE_FULL_SCREEN_INTENT',
      'android.permission.SYSTEM_ALERT_WINDOW',
    ];

    if (!manifest['uses-permission']) {
      manifest['uses-permission'] = [];
    }

    permissions.forEach((permission) => {
      const exists = manifest['uses-permission'].some(
        (p) => p.$?.['android:name'] === permission
      );
      if (!exists) {
        manifest['uses-permission'].push({
          $: { 'android:name': permission },
        });
      }
    });

    // Add showWhenLocked and turnScreenOn to the MainActivity (required to wake screen)
    const application = manifest.application?.[0];
    if (application && application.activity) {
      const mainActivity = application.activity.find(
        (a) => a.$?.['android:name'] === '.MainActivity'
      );
      if (mainActivity) {
        mainActivity.$['android:showWhenLocked'] = 'true';
        mainActivity.$['android:turnScreenOn'] = 'true';
      }
    }

    return config;
  });
};
