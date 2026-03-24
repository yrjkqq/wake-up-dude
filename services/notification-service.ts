import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Configure how notifications appear when the app is in the foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const ALARM_CHANNEL_ID = 'alarm-channel';

/**
 * Initialize notification settings.
 * On Android, creates a notification channel with the custom alarm sound.
 */
export async function initNotifications(): Promise<void> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(ALARM_CHANNEL_ID, {
      name: 'Alarm',
      importance: Notifications.AndroidImportance.MAX,
      sound: 'test_alarm.wav',
      vibrationPattern: [0, 500, 250, 500],
      enableVibrate: true,
    });
  }
}

/**
 * Request notification permissions from the user.
 * Returns true if permission was granted.
 */
export async function requestPermissions(): Promise<boolean> {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();

  if (existingStatus === 'granted') {
    return true;
  }

  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

/**
 * Schedule a local notification at the given time with custom alarm sound.
 * Returns the notification identifier (used for cancellation).
 */
export async function scheduleAlarm(time: Date): Promise<string> {
  // Cancel any existing alarm first
  await cancelAllAlarms();

  const now = new Date();
  let trigger = time;

  // If the time is in the past, schedule for tomorrow
  if (trigger <= now) {
    trigger = new Date(trigger);
    trigger.setDate(trigger.getDate() + 1);
  }

  const secondsUntilAlarm = Math.max(
    1,
    Math.floor((trigger.getTime() - now.getTime()) / 1000)
  );

  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: '⏰ Wake up dude!',
      body: '起床啦！别再赖床了！',
      sound: Platform.OS === 'android' ? 'test_alarm.wav' : true,
      priority: Notifications.AndroidNotificationPriority.MAX,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: secondsUntilAlarm,
    },
  });

  console.log(
    `Alarm scheduled: ${id}, fires in ${secondsUntilAlarm}s (at ${trigger.toLocaleTimeString()})`
  );

  return id;
}

/**
 * Cancel all scheduled alarm notifications.
 */
export async function cancelAllAlarms(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
  console.log('All alarms cancelled');
}

/**
 * Get all currently scheduled notifications (for debugging).
 */
export async function getScheduledAlarms() {
  return Notifications.getAllScheduledNotificationsAsync();
}
