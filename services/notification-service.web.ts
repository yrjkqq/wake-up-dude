// Mocked notification service for Web platform
// This prevents 'expo-notifications' from being imported during Web SSR
// which crashes Node.js because localStorage is not defined in Node.

export async function initNotifications(): Promise<void> {
  console.log('[Web Mock] initNotifications called');
}

export async function requestPermissions(): Promise<boolean> {
  console.log('[Web Mock] requestPermissions called');
  return false; // Web doesn't support our native alarm notifications
}

export async function scheduleAlarm(
  timeStr: string,
  persona: string,
  audioUri?: string
): Promise<string> {
  console.log('[Web Mock] scheduleAlarm called with', timeStr, persona);
  return 'web-mock-id';
}

export async function cancelAllAlarms(): Promise<void> {
  console.log('[Web Mock] cancelAllAlarms called');
}

export async function checkAlarmSoundEnabled(): Promise<boolean> {
  return true;
}
