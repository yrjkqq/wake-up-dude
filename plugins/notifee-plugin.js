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

    return config;
  });
};
