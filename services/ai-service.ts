import * as FileSystem from 'expo-file-system/legacy';
import { getAlarms, updateAlarmAudio, addDebugLog } from './database';
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
  externalSignal?: AbortSignal,
  alarmType: 'voice' | 'music' = 'voice'
): Promise<{ text: string; audioUri: string }> {
  
  const textModel = await AsyncStorage.getItem('SETTINGS_TEXT_MODEL') || 'gemini-3.1-pro-preview';
  const ttsModel = await AsyncStorage.getItem('SETTINGS_TTS_MODEL') || 'gemini-2.5-pro-preview-tts';
  const musicModel = await AsyncStorage.getItem('SETTINGS_MUSIC_MODEL') || 'lyria-3-clip-preview';

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
    const logStart = `🚀 开始请求 Cloudflare: ${apiUrl} | time=${timeStr} persona=${persona} textModel=${textModel} ttsModel=${ttsModel} alarmType=${alarmType} musicModel=${musicModel}`;
    console.log(`[AI Service] ${logStart}`);
    addDebugLog('AI-Net', logStart);
    const fetchStartTime = Date.now();
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ time: timeStr, persona, textModel, ttsModel, alarmType, musicModel }),
      signal: internalController.signal,
    });

    if (!response.ok) {
      const errMsg = `API Server error: ${response.status} ${response.statusText}`;
      const logErr = `❌ ${errMsg} (url: ${apiUrl})`;
      console.log(`[AI Service] ${logErr}`);
      addDebugLog('AI-Net', logErr, 'error');
      throw new Error(errMsg);
    }

    const logResp = `响应收到 ${timeStr}. Status: ${response.status}, 耗时: ${((Date.now() - fetchStartTime) / 1000).toFixed(1)}s`;
    console.log(`[AI Service] ${logResp}`);
    addDebugLog('AI-Net', logResp);
    const data = await response.json();
    
    if (!data.success) {
      const errMsg = data.error || 'Failed to generate alarm from API';
      const logFail = `❌ API returned failure: ${errMsg}`;
      console.log(`[AI Service] ${logFail}`);
      addDebugLog('AI-Net', logFail, 'error');
      throw new Error(errMsg);
    }

    const { audioBase64, text, audioFormat = 'wav' } = data;
    const timestamp = Date.now();
    const fileUri = FileSystem.documentDirectory + `ai_alarm_${timestamp}.${audioFormat}`;

    await FileSystem.writeAsStringAsync(fileUri, audioBase64, {
      encoding: 'base64',
    });

    const logDone = `✅ Audio saved for ${timeStr}. Size: ${Math.round(audioBase64.length / 1024)} KB | File: ${fileUri}`;
    console.log(`[AI Service] ${logDone}`);
    addDebugLog('AI-Net', logDone);
    
    return { text, audioUri: fileUri };
  } catch (e: any) {
    // Capture network-level failures (VPN disconnect, DNS, timeout, etc.)
    if (e.name === 'AbortError') {
      const logWarn = `⏱️ Request aborted/timed out for ${timeStr}`;
      console.log(`[AI Service] ${logWarn}`);
      addDebugLog('AI-Net', logWarn, 'warn');
    } else if (e.message?.includes('Network request failed') || e.message?.includes('Failed to fetch')) {
      const logErrNet = `🌐 Network failure (possible VPN/GFW issue): ${e.message}`;
      console.log(`[AI Service] ${logErrNet}`);
      addDebugLog('AI-Net', logErrNet, 'error');
    } else {
      const logErr = `❌ Unexpected error for ${timeStr}: ${e.message}`;
      console.log(`[AI Service] ${logErr}`);
      addDebugLog('AI-Net', logErr, 'error');
    }
    throw e;
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
      const logErr = `Alarm ID ${alarmId} not found in DB`;
      console.log(`[AI Service] ❌ ${logErr}`);
      addDebugLog('AI-Gen', logErr, 'error');
      throw new Error(`Alarm with ID ${alarmId} not found in DB`);
    }

    const logGenStart = `Starting generation for Alarm ${alarmId} (${alarm.time}, ${alarm.persona}, ${alarm.alarmType})`;
    console.log(`[AI Service] ${logGenStart}`);
    addDebugLog('AI-Gen', logGenStart);
    
    const { text, audioUri } = await generateAlarmAudio(alarm.time, alarm.persona, controller.signal, alarm.alarmType);
    
    // Update the database with both the new local file URI and the AI text
    updateAlarmAudio(alarmId, audioUri, text);
    const logGenDone = `✅ Generation complete for Alarm ${alarmId}. Audio: ${audioUri}`;
    console.log(`[AI Service] ${logGenDone}`);
    addDebugLog('AI-Gen', logGenDone);
  } catch (e: any) {
    const logErr = `❌ Generation failed for Alarm ${alarmId}: ${e.message}`;
    console.log(`[AI Service] ${logErr}`);
    addDebugLog('AI-Gen', logErr, 'error');
    throw e;
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
