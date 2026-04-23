import { registerRootComponent } from 'expo';
import { ExpoRoot } from 'expo-router';
import notifee, { EventType } from '@notifee/react-native';
import { generateAlarmAudioForId } from './services/ai-service';
import { initNotifications } from './services/notification-service';
import { addDebugLog } from './services/database';

// 1. Initialize channels and background handlers EARLY
initNotifications();

// 2. Register Notifee Foreground Service task (Allows reliable background JS on Android)
notifee.registerForegroundService(async (notification) => {
  if (notification?.data?.type === 'AI_GENERATE') {
    const alarmIdRaw = notification.data.alarmId;
    const alarmId = parseInt(alarmIdRaw as string, 10);
    
    if (!isNaN(alarmId)) {
      addDebugLog('FGService', `🚀 Foreground Service started for Alarm ${alarmId} (notification: ${notification.id})`);
      console.log(`[Background] 🤖 Foreground Service: Starting AI generation for Alarm ID: ${alarmId}`);
      try {
        // 1. Mandatory delay to allow system to recognize the foreground notification
        await new Promise(resolve => setTimeout(resolve, 200));
        await generateAlarmAudioForId(alarmId);
        addDebugLog('FGService', `✅ Foreground Service completed successfully for Alarm ${alarmId}`);
        console.log(`[Background] ✅ AI Generation successful for Alarm ID: ${alarmId}`);
      } catch (err: any) {
        addDebugLog('FGService', `❌ Foreground Service FAILED for Alarm ${alarmId}: ${err.message}`, 'error');
        console.error(`[Background] ❌ AI Generation failed for Alarm ID: ${alarmId}`, err);
      } finally {
        // 2. Always stop the service to avoid "Bad notification" or resource leaks
        addDebugLog('FGService', `Stopping foreground service for Alarm ${alarmId}`);
        await notifee.stopForegroundService();
        if (notification.id) {
          await notifee.cancelNotification(notification.id);
        }
      }
    } else {
      addDebugLog('FGService', `⚠️ Invalid alarmId received: ${alarmIdRaw}`, 'warn');
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
