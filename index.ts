import { registerRootComponent } from 'expo';
import { ExpoRoot } from 'expo-router';
import notifee, { EventType } from '@notifee/react-native';
import { generateAlarmAudioForId } from './services/ai-service';

// 1. Register Notifee background event handler EARLY (before React mounts)
// This is critical for Android Headless JS to work.
notifee.onBackgroundEvent(async ({ type, detail }) => {
  const { notification } = detail;

  // Check if this is an "AI_GENERATE" silent trigger
  if (type === EventType.TRIGGER_NOTIFICATION_CREATED || type === EventType.DELIVERED) {
    if (notification?.data?.type === 'AI_GENERATE') {
      const alarmId = parseInt(notification.data.alarmId as string, 10);
      if (!isNaN(alarmId)) {
        console.log(`[Background] 🤖 Starting scheduled AI generation for Alarm ID: ${alarmId}`);
        try {
          await generateAlarmAudioForId(alarmId);
          console.log(`[Background] ✅ AI Generation successful for Alarm ID: ${alarmId}`);
        } catch (err) {
          console.error(`[Background] ❌ AI Generation failed for Alarm ID: ${alarmId}`, err);
        }
      }
      // Clean up the trigger notification if it persists
      if (notification.id) {
        await notifee.cancelNotification(notification.id);
      }
    }
  }
});

// 2. Standard Expo Router entry logic
export function App() {
  // @ts-ignore: require.context is handled by Metro transformer
  const ctx = require.context('./app');
  return <ExpoRoot context={ctx} />;
}

registerRootComponent(App);
