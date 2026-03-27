import * as FileSystem from 'expo-file-system/legacy';
import { getAlarms, updateAlarmAudio } from './database';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const LATEST_ALARM_KEY = 'LATEST_ALARM_FILE_URI';

/**
 * Core generation logic shared between manual and background triggers.
 * NOTE: History is no longer saved here, per user requirement to save only on trigger.
 */
export async function generateAlarmAudio(
  timeStr: string,
  persona: string = '👺 毒舌监督员'
): Promise<{ text: string; audioUri: string }> {
  
  const textModel = await AsyncStorage.getItem('SETTINGS_TEXT_MODEL') || 'gemini-3.1-pro-preview';
  const ttsModel = await AsyncStorage.getItem('SETTINGS_TTS_MODEL') || 'gemini-2.5-pro-preview-tts';

  let apiUrl = process.env.EXPO_PUBLIC_API_URL;
  if (!apiUrl) {
    apiUrl = 'https://wake-up-dude-api.wake-up-dude-api.workers.dev';
  }

  console.log('[AI Service] Requesting payload from API Server:', apiUrl, 'TextModel:', textModel);
  
  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ time: timeStr, persona, textModel, ttsModel }),
  });

  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.error || 'Failed to generate alarm from API');
  }

  const { audioBase64, text } = data;
  const timestamp = Date.now();
  const fileUri = FileSystem.documentDirectory + `ai_alarm_${timestamp}.wav`;

  await FileSystem.writeAsStringAsync(fileUri, audioBase64, {
    encoding: 'base64',
  });

  await AsyncStorage.setItem(LATEST_ALARM_KEY, fileUri);

  console.log('[AI Service] Generated dynamic alarm audio to:', fileUri);
  return { text, audioUri: fileUri };
}

/**
 * Background-friendly wrapper that fetches alarm metadata from DB first.
 */
export async function generateAlarmAudioForId(alarmId: number): Promise<void> {
  const alarms = getAlarms();
  const alarm = alarms.find(a => a.id === alarmId);
  
  if (!alarm) {
    throw new Error(`Alarm with ID ${alarmId} not found in DB`);
  }

  console.log(`[AI Service] Background generating for alarm: ${alarm.time} (${alarm.persona})`);
  const { audioUri } = await generateAlarmAudio(alarm.time, alarm.persona);
  
  // Update the database with the new local file URI
  updateAlarmAudio(alarmId, audioUri);
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
