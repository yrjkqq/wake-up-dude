import { registerRootComponent } from 'expo';
import { ExpoRoot } from 'expo-router';
import notifee, { EventType } from '@notifee/react-native';
import { generateAlarmAudioForId } from './services/ai-service';
import { initNotifications } from './services/notification-service';

// 1. Initialize channels and background handlers EARLY
initNotifications();

// 2. Register Notifee Foreground Service task (Allows reliable background JS on Android)
notifee.registerForegroundService(async (notification) => {
  if (notification?.data?.type === 'AI_GENERATE') {
    const alarmIdRaw = notification.data.alarmId;
    const alarmId = parseInt(alarmIdRaw as string, 10);
    
    if (!isNaN(alarmId)) {
      console.log(`[Background] 🤖 Foreground Service: Starting AI generation for Alarm ID: ${alarmId}`);
      try {
        // 1. Mandatory delay to allow system to recognize the foreground notification
        await new Promise(resolve => setTimeout(resolve, 200));
        await generateAlarmAudioForId(alarmId);
        console.log(`[Background] ✅ AI Generation successful for Alarm ID: ${alarmId}`);
      } catch (err) {
        console.error(`[Background] ❌ AI Generation failed for Alarm ID: ${alarmId}`, err);
      } finally {
        // 2. Always stop the service to avoid "Bad notification" or resource leaks
        await notifee.stopForegroundService();
        if (notification.id) {
          await notifee.cancelNotification(notification.id);
        }
      }
    }
  }
});

// 2. Keep the onBackgroundEvent for direct interaction if user taps the silent notification
notifee.onBackgroundEvent(async ({ type, detail }) => {
  if (detail.notification?.data?.type === 'AI_GENERATE' && type === EventType.PRESS) {
    // Just a safety placeholder
    console.log('[Background] User pressed AI Prep notification');
  }
});

// 2. Standard Expo Router entry logic
export function App() {
  // @ts-ignore: require.context is handled by Metro transformer
  const ctx = require.context('./app');
  return <ExpoRoot context={ctx} />;
}

registerRootComponent(App);
