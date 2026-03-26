// Mocked notification service for Web platform
// Prevents '@notifee/react-native' from being imported during Web SSR

export async function initNotifications(): Promise<void> {
  console.log('[Web Mock] initNotifications called');
}

export async function requestPermissions(): Promise<boolean> {
  console.log('[Web Mock] requestPermissions called');
  return false;
}

export async function checkExactAlarmPermission(): Promise<boolean> {
  return true;
}

export async function openAlarmSettings(): Promise<void> {
  console.log('[Web Mock] openAlarmSettings called');
}

export async function checkAlarmSoundEnabled(): Promise<boolean> {
  return true;
}

export async function scheduleAlarm(time: Date): Promise<string> {
  console.log('[Web Mock] scheduleAlarm called with', time);
  return 'web-mock-id';
}

export async function cancelAllAlarms(): Promise<void> {
  console.log('[Web Mock] cancelAllAlarms called');
}

export async function getScheduledAlarms(): Promise<string[]> {
  return [];
}
