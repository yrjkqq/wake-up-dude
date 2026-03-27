import * as FileSystem from 'expo-file-system/legacy';
import { getAlarms, updateAlarmAudio } from './database';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const LATEST_ALARM_KEY = 'LATEST_ALARM_FILE_URI';

// Map to track active AbortControllers by alarmId
const activeControllers = new Map<number, AbortController>();

/**
 * Core generation logic shared between manual and background triggers.
 * NOTE: History is no longer saved here, per user requirement to save only on trigger.
 */
export async function generateAlarmAudio(
  timeStr: string,
  persona: string = '👺 毒舌监督员',
  externalSignal?: AbortSignal
): Promise<{ text: string; audioUri: string }> {
  
  const textModel = await AsyncStorage.getItem('SETTINGS_TEXT_MODEL') || 'gemini-3.1-pro-preview';
  const ttsModel = await AsyncStorage.getItem('SETTINGS_TTS_MODEL') || 'gemini-2.5-pro-preview-tts';

  let apiUrl = process.env.EXPO_PUBLIC_API_URL;
  if (!apiUrl) {
    apiUrl = 'https://wake-up-dude-api.wake-up-dude-api.workers.dev';
  }

  console.log('[AI Service] Requesting payload from API Server:', apiUrl, 'TextModel:', textModel);
  
  const internalController = new AbortController();
  const timeoutId = setTimeout(() => internalController.abort(), 90000); // 90s timeout

  // If we have an external signal (e.g. from the per-alarm controller), link them
  if (externalSignal) {
    externalSignal.addEventListener('abort', () => internalController.abort());
    if (externalSignal.aborted) internalController.abort();
  }

  console.log(`[AI Service] Starting network fetch for ${timeStr}...`);

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ time: timeStr, persona, textModel, ttsModel }),
      signal: internalController.signal,
    });

    if (!response.ok) {
      throw new Error(`API Server error: ${response.status} ${response.statusText}`);
    }

    console.log(`[AI Service] Response headers received. Parsing JSON payload...`);
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'Failed to generate alarm from API');
    }

    const { audioBase64, text } = data;
    console.log(`[AI Service] Payload received. Audio length: ${Math.round(audioBase64.length / 1024)} KB. Writing to disk...`);
    const timestamp = Date.now();
    const fileUri = FileSystem.documentDirectory + `ai_alarm_${timestamp}.wav`;

    await FileSystem.writeAsStringAsync(fileUri, audioBase64, {
      encoding: 'base64',
    });

    console.log('[AI Service] Generated dynamic alarm audio to:', fileUri);
    return { text, audioUri: fileUri };
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Background-friendly wrapper that fetches alarm metadata from DB first.
 * Now manages concurrency per alarmId.
 */
export async function generateAlarmAudioForId(alarmId: number): Promise<void> {
  // 1. Abort any existing generation for this alarm
  cancelAlarmGeneration(alarmId);

  // 2. Setup new controller
  const controller = new AbortController();
  activeControllers.set(alarmId, controller);

  try {
    const alarms = getAlarms();
    const alarm = alarms.find(a => a.id === alarmId);
    
    if (!alarm) {
      throw new Error(`Alarm with ID ${alarmId} not found in DB`);
    }

    console.log(`[AI Service] Generating content for ${alarm.time} (${alarm.persona}). Timeout: 90s`);
    const { text, audioUri } = await generateAlarmAudio(alarm.time, alarm.persona, controller.signal);
    
    // Update the database with both the new local file URI and the AI text
    updateAlarmAudio(alarmId, audioUri, text);
  } finally {
    // Clean up
    if (activeControllers.get(alarmId) === controller) {
      activeControllers.delete(alarmId);
    }
  }
}

/**
 * Aborts an ongoing AI generation for a specific alarm.
 */
export function cancelAlarmGeneration(alarmId: number) {
  const controller = activeControllers.get(alarmId);
  if (controller) {
    console.log(`[AI Service] Aborting active generation for Alarm ID: ${alarmId}`);
    controller.abort();
    activeControllers.delete(alarmId);
  }
}

export async function checkHasLatestAlarm(): Promise<string | null> {
  const uri = await AsyncStorage.getItem(LATEST_ALARM_KEY);
  if (!uri) return null;
  
  const info = await FileSystem.getInfoAsync(uri);
  if (info.exists) {
    return uri;
  }
  return null;
}
