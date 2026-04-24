import notifee, {
  AndroidImportance,
  AndroidCategory,
  AndroidNotificationSetting,
  AndroidVisibility,
  TimestampTrigger,
  TriggerType,
} from '@notifee/react-native';
import { Platform } from 'react-native';
import { Alarm, getAlarmById, addDebugLog } from './database';
import { generateAlarmAudioForId, cancelAlarmGeneration } from './ai-service';

const ALARM_CHANNEL_ID = 'alarm-channel-notifee';
const SILENT_CHANNEL_ID = 'silent-channel-notifee';

/**
 * Initialize notification channels.
 */
export async function initNotifications(): Promise<void> {
  if (Platform.OS === 'android') {
    // 1. Loud channel for Alarms
    await notifee.createChannel({
      id: ALARM_CHANNEL_ID,
      name: 'Alarm',
      importance: AndroidImportance.HIGH,
      bypassDnd: true,
      visibility: AndroidVisibility.PUBLIC,
      sound: 'test_alarm',
      vibration: true,
      vibrationPattern: [300, 500, 300, 500],
    });

    // 2. Silent (but valid) channel for Background tasks
    await notifee.createChannel({
      id: SILENT_CHANNEL_ID,
      name: 'Background Service',
      importance: AndroidImportance.DEFAULT, // Required for reliable ForegroundServices on Android 12+
      visibility: AndroidVisibility.SECRET,
      sound: undefined, 
    });
  }
}

export async function requestPermissions(): Promise<boolean> {
  const settings = await notifee.requestPermission();
  return settings.authorizationStatus >= 1;
}

export async function checkExactAlarmPermission(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;
  const settings = await notifee.getNotificationSettings();
  return settings.android.alarm === AndroidNotificationSetting.ENABLED;
}

export async function openAlarmSettings(): Promise<void> {
  await notifee.openAlarmPermissionSettings();
}

/**
 * Helper to calculate the next occurrence of a HH:mm time.
 * If `days` is provided (JSON array of day indices 0=Sun..6=Sat),
 * it skips forward to the next matching weekday.
 * If `days` is empty or "[]", the alarm fires every day (next available).
 */
function getNextTriggerDate(timeStr: string, days?: string): Date {
  const [hours, minutes] = timeStr.split(':').map(Number);
  const now = new Date();
  const trigger = new Date();
  trigger.setHours(hours, minutes, 0, 0);

  // If trigger time has already passed today, start from tomorrow
  if (trigger <= now) {
    trigger.setDate(trigger.getDate() + 1);
  }

  // Parse enabled days (0=Sun..6=Sat). Empty array = every day.
  let enabledDays: number[] = [];
  try {
    enabledDays = days ? JSON.parse(days) : [];
  } catch {
    enabledDays = [];
  }

  // If specific days are configured, skip forward to the next matching weekday
  if (enabledDays.length > 0) {
    for (let i = 0; i < 7; i++) {
      if (enabledDays.includes(trigger.getDay())) {
        return trigger;
      }
      trigger.setDate(trigger.getDate() + 1);
    }
  }

  return trigger;
}

/**
 * Schedules two triggers for a given alarm:
 * 1. AI Generation Trigger (T - 1 hour) - Silent background task
 * 2. Actual Alarm Trigger (T) - Loud notification
 */
export async function scheduleAlarm(alarm: Alarm): Promise<void> {
  addDebugLog('Schedule', `Alarm ${alarm.id} (${alarm.time}): scheduleAlarm() called, days=${alarm.days}, enabled=${alarm.enabled}`);

  // Cancel previous triggers for this specific alarm ID if they exist
  await cancelAlarm(alarm.id);

  if (!alarm.enabled) {
    addDebugLog('Schedule', `Alarm ${alarm.id}: skipped (disabled)`);
    return;
  }

  const triggerDate = getNextTriggerDate(alarm.time, alarm.days);
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  addDebugLog('Schedule', `Alarm ${alarm.id}: next trigger = ${dayNames[triggerDate.getDay()]} ${triggerDate.toLocaleString()}`);
  const genTriggerDate = new Date(triggerDate.getTime() - 60 * 60 * 1000); // 1 hour before

  // 1. Schedule AI Generation Trigger (Silent)
  if (genTriggerDate <= new Date()) {
    // If alarm is less than 1h away, generate immediately in the background
    addDebugLog('Schedule', `Alarm ${alarm.id} (${alarm.time}): AI gen time already passed, generating immediately`);
    generateAlarmAudioForId(alarm.id).catch((e: Error) => {
      if (e.name === 'AbortError' || e.message?.includes('Aborted')) {
        console.log(`[Notifee] Generation for alarm ${alarm.id} aborted (new request pending).`);
        addDebugLog('Schedule', `Alarm ${alarm.id}: AI gen aborted (new request pending)`, 'warn');
      } else {
        console.error('[Notifee] Immediate generation failed:', e);
        addDebugLog('Schedule', `Alarm ${alarm.id}: Immediate AI gen FAILED: ${e.message}`, 'error');
      }
    });
  } else {
    const genTrigger: TimestampTrigger = {
      type: TriggerType.TIMESTAMP,
      timestamp: genTriggerDate.getTime(),
      alarmManager: { type: 4 }, // SET_ALARM_CLOCK for precision
    };

    const genTimestamp = Date.now();
    await notifee.createTriggerNotification(
      {
        id: `gen_${alarm.id}_${genTimestamp}`, // Unique ID to avoid crash during reschedule
        title: 'AI Generation (Background)',
        body: 'Preparing your custom alarm...',
        data: {
          type: 'AI_GENERATE',
          alarmId: alarm.id.toString(),
        },
        android: {
          channelId: SILENT_CHANNEL_ID,
          importance: AndroidImportance.DEFAULT, 
          visibility: AndroidVisibility.SECRET,
          asForegroundService: true, // Crucial for background JS execution on Android
          pressAction: { id: 'default' }, // Recommended for foreground service stability
          smallIcon: 'ic_launcher', // Explicitly set to avoid "Bad notification" crash
        },
      },
      genTrigger
    );
    addDebugLog('Schedule', `Alarm ${alarm.id}: AI gen trigger scheduled at ${genTriggerDate.toLocaleTimeString()} (id: gen_${alarm.id}_${genTimestamp})`);
  }

  // 2. Schedule Actual Alarm Trigger (Loud)
  // We use "alarm_${id}" for the main alarm
  const alarmTrigger: TimestampTrigger = {
    type: TriggerType.TIMESTAMP,
    timestamp: triggerDate.getTime(),
    alarmManager: { type: 4 },
  };

  await notifee.createTriggerNotification(
    {
      id: `alarm_${alarm.id}`,
      title: '⏰ Wake up dude!',
      body: '起床啦！别再赖床了！',
      data: {
        alarmId: alarm.id.toString(),
      },
      android: {
        channelId: ALARM_CHANNEL_ID,
        category: AndroidCategory.ALARM,
        importance: AndroidImportance.HIGH,
        fullScreenAction: {
          id: 'default',
          launchActivity: 'default',
        },
        ongoing: true,
        autoCancel: false,
        sound: 'test_alarm',
        pressAction: { id: 'default' },
      },
    },
    alarmTrigger
  );
  addDebugLog('Schedule', `Alarm ${alarm.id}: alarm trigger created (id: alarm_${alarm.id}, ts: ${triggerDate.getTime()})`);

  // Verify triggers were actually registered with the OS
  const registeredIds = await notifee.getTriggerNotificationIds();
  const thisAlarmTriggers = registeredIds.filter(id => id.includes(alarm.id.toString()));
  addDebugLog('Schedule', `✅ Alarm ${alarm.id} (${alarm.time}) fully scheduled. Registered triggers: [${thisAlarmTriggers.join(', ')}]. Trigger: ${triggerDate.toISOString()}, AI Gen: ${genTriggerDate.toISOString()}`);
}

/**
 * Reschedule an alarm for its next occurrence.
 * Called after an alarm fires to enable daily/weekly repetition.
 */
export async function rescheduleAlarm(alarmId: number): Promise<void> {
  addDebugLog('Reschedule', `rescheduleAlarm(${alarmId}) called`);
  const alarm = getAlarmById(alarmId);
  if (!alarm) {
    addDebugLog('Reschedule', `Alarm ${alarmId} not found in DB, skipping reschedule`, 'warn');
    return;
  }
  if (!alarm.enabled) {
    addDebugLog('Reschedule', `Alarm ${alarmId} is disabled, skipping reschedule`);
    return;
  }

  addDebugLog('Reschedule', `Alarm ${alarmId} (${alarm.time}, days=${alarm.days}): calling scheduleAlarm for next occurrence`);
  await scheduleAlarm(alarm);
  addDebugLog('Reschedule', `✅ Alarm ${alarmId} reschedule complete`);
}

/**
 * Cancel a specific alarm's triggers.
 */
export async function cancelAlarm(alarmId: number): Promise<void> {
  cancelAlarmGeneration(alarmId);
  
  // Surgical cleanup of any existing prep trigger notifications for this ID
  const triggers = await notifee.getTriggerNotificationIds();
  const cancelledGenIds: string[] = [];
  for (const id of triggers) {
    if (id.startsWith(`gen_${alarmId}_`)) {
      await notifee.cancelNotification(id);
      cancelledGenIds.push(id);
    }
  }

  await notifee.cancelNotification(`alarm_${alarmId}`);
  addDebugLog('Cancel', `Alarm ${alarmId} cancelled. Removed triggers: alarm_${alarmId}${cancelledGenIds.length ? ', ' + cancelledGenIds.join(', ') : ''}`);
}

/**
 * Cancel all scheduled alarm notifications.
 */
export async function cancelAllAlarms(): Promise<void> {
  await notifee.cancelAllNotifications();
  addDebugLog('Cancel', 'All alarms cancelled');
  console.log('[Notifee] All alarms cancelled');
}

/**
 * Get all currently scheduled trigger notification IDs (for debugging).
 */
export async function getScheduledAlarms(): Promise<string[]> {
  return notifee.getTriggerNotificationIds();
}
