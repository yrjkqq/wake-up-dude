import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { saveAlarmToHistory } from './database';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const LATEST_ALARM_KEY = 'LATEST_ALARM_FILE_URI';

export async function generateAlarmAudio(
  timeStr: string,
  persona: string = '毒舌监督员'
): Promise<{ text: string; audioUri: string }> {
  
  const textModel = await AsyncStorage.getItem('SETTINGS_TEXT_MODEL') || 'gemini-3.1-pro-preview';
  const ttsModel = await AsyncStorage.getItem('SETTINGS_TTS_MODEL') || 'gemini-2.5-pro-preview-tts';

  let apiUrl = process.env.EXPO_PUBLIC_API_URL;
  if (!apiUrl) {
    let host = 'localhost:8081';
    if (Constants.expoConfig?.hostUri) {
      host = Constants.expoConfig.hostUri;
    } else if (Platform.OS === 'android') {
      host = '192.168.0.105:8081';
    }
    apiUrl = `http://${host}/api/gen-alarm`;
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

  // Store the target alarm time explicitly in the history UI by prepending it to the persona string
  saveAlarmToHistory(`[${timeStr}] ${persona}`, text, fileUri);
  await AsyncStorage.setItem(LATEST_ALARM_KEY, fileUri);

  console.log('[AI Service] Saved dynamic alarm audio/history to:', fileUri);
  return { text, audioUri: fileUri };
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
