import notifee, {
  AndroidImportance,
  AndroidCategory,
  AndroidNotificationSetting,
  TimestampTrigger,
  TriggerType,
} from '@notifee/react-native';
import { Platform } from 'react-native';

const ALARM_CHANNEL_ID = 'alarm-channel-notifee';

/**
 * Initialize notification channel.
 * Creates an Android notification channel with alarm-level importance
 * and the bundled fallback sound.
 */
export async function initNotifications(): Promise<void> {
  if (Platform.OS === 'android') {
    await notifee.createChannel({
      id: ALARM_CHANNEL_ID,
      name: 'Alarm',
      importance: AndroidImportance.HIGH,
      sound: 'test_alarm', // maps to res/raw/test_alarm.wav (bundled by expo-notifications plugin)
      vibration: true,
      vibrationPattern: [300, 500, 300, 500],
    });
  }
}

/**
 * Request notification permissions from the user.
 * Returns true if permission was granted.
 */
export async function requestPermissions(): Promise<boolean> {
  const settings = await notifee.requestPermission();
  // On Android 13+, authorizationStatus will be AUTHORIZED(1) or DENIED(0)
  return settings.authorizationStatus >= 1;
}

/**
 * Check if the exact alarm permission is enabled (Android 12+).
 * Returns true if allowed, false if user needs to manually enable.
 */
export async function checkExactAlarmPermission(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;

  const settings = await notifee.getNotificationSettings();
  return settings.android.alarm === AndroidNotificationSetting.ENABLED;
}

/**
 * Open the system "Alarms & Reminders" settings page for this app.
 */
export async function openAlarmSettings(): Promise<void> {
  await notifee.openAlarmPermissionSettings();
}

/**
 * Check if the user has manually muted the alarm channel in Android system settings.
 * Returns true if sound is enabled, false if silenced.
 */
export async function checkAlarmSoundEnabled(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;

  const channel = await notifee.getChannel(ALARM_CHANNEL_ID);
  if (!channel) return false;

  // importance LOW(2) or MIN(1) means silent
  if (channel.importance !== undefined && channel.importance < AndroidImportance.DEFAULT) {
    return false;
  }

  return true;
}

/**
 * Schedule a local alarm notification at the given time using Notifee's
 * TimestampTrigger with AlarmManager for precise delivery, even in Doze mode.
 *
 * Configures fullScreenAction to launch the 'alarm-screen' React component
 * when the alarm fires, allowing expo-av to play dynamic AI audio from the
 * lock screen / screen-off state.
 */
export async function scheduleAlarm(time: Date): Promise<string> {
  // Cancel any existing alarm first
  await cancelAllAlarms();

  const now = new Date();
  let trigger = new Date(time);

  // If the time is in the past, schedule for tomorrow
  if (trigger <= now) {
    trigger.setDate(trigger.getDate() + 1);
  }

  const tsTrigger: TimestampTrigger = {
    type: TriggerType.TIMESTAMP,
    timestamp: trigger.getTime(),
    alarmManager: {
      allowWhileIdle: true,
    },
  };

  const id = await notifee.createTriggerNotification(
    {
      title: '⏰ Wake up dude!',
      body: '起床啦！别再赖床了！',
      android: {
        channelId: ALARM_CHANNEL_ID,
        category: AndroidCategory.ALARM,
        importance: AndroidImportance.HIGH,
        fullScreenAction: {
          id: 'default',
          mainComponent: 'alarm-screen',
        },
        ongoing: true,     // user cannot swipe-dismiss
        autoCancel: false,  // stays until programmatically cancelled
        sound: 'test_alarm', // system-level fallback sound
        pressAction: {
          id: 'default',
        },
      },
    },
    tsTrigger,
  );

  const secondsUntil = Math.floor((trigger.getTime() - now.getTime()) / 1000);
  console.log(
    `[Notifee] Alarm scheduled: ${id}, fires in ${secondsUntil}s (at ${trigger.toLocaleTimeString()})`
  );

  return id;
}

/**
 * Cancel all scheduled alarm notifications.
 */
export async function cancelAllAlarms(): Promise<void> {
  await notifee.cancelAllNotifications();
  console.log('[Notifee] All alarms cancelled');
}

/**
 * Get all currently scheduled trigger notification IDs (for debugging).
 */
export async function getScheduledAlarms(): Promise<string[]> {
  return notifee.getTriggerNotificationIds();
}
