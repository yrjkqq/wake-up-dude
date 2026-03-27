/**
 * AlarmScreen — Full-screen alarm component launched by Notifee's fullScreenAction
 *
 * When the alarm fires (even from lock-screen / screen-off / app-killed state),
 * Android will start this React component via the full-screen intent.
 * It immediately loads and plays the latest AI-generated audio via expo-av,
 * looping until the user dismisses via SwipeToStop.
 *
 * This component is registered globally via AppRegistry.registerComponent('alarm-screen', ...)
 * in the app entry point (_layout.tsx).
 */
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, StyleSheet, StatusBar, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system/legacy';
import AsyncStorage from '@react-native-async-storage/async-storage';
import notifee from '@notifee/react-native';

import SwipeToStop from '@/components/SwipeToStop';
import { ThemedText } from '@/components/themed-text';
import { LATEST_ALARM_KEY } from '@/services/ai-service';
import { getAlarms, saveAlarmToHistory } from '@/services/database';

interface Props {
  alarmId?: number;
  onClose?: () => void;
}

function AlarmScreenComponent({ alarmId, onClose }: Props) {
  const soundRef = useRef<Audio.Sound | null>(null);
  const [currentTime, setCurrentTime] = useState('');
  const [isStopped, setIsStopped] = useState(false);
  const [persona, setPersona] = useState('AI 专属语音');

  // Tick the clock display
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const hh = String(now.getHours()).padStart(2, '0');
      const mm = String(now.getMinutes()).padStart(2, '0');
      setCurrentTime(`${hh}:${mm}`);
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Auto-play audio on mount
  useEffect(() => {
    let mounted = true;
    setIsStopped(false);

    (async () => {
      try {
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          staysActiveInBackground: true,
        });

        // 1. Find the specific alarm and its audio
        let audioUri: string | null = null;
        let alarmPersona = '🌸 温柔女友';
        
        if (alarmId !== undefined) {
          const alarm = getAlarms().find((a: any) => a.id === alarmId);
          if (alarm) {
            audioUri = alarm.lastAudioUri;
            alarmPersona = alarm.persona;
            setPersona(alarmPersona);
            
            // 2. RECORD TO HISTORY (Use actual generated text and alarm time as requested)
            const recordTitle = `${alarm.time} · ${alarmPersona}`; 
            const recordText = alarm.lastText || '（AI 语音叫醒服务已启动）';
            saveAlarmToHistory(recordTitle, recordText, audioUri || 'fallback');
          }
        } else {
          audioUri = await AsyncStorage.getItem(LATEST_ALARM_KEY);
        }

        let soundToPlay: Audio.Sound;

        // 3. Fallback logic
        if (audioUri && audioUri !== 'fallback') {
          const info = await FileSystem.getInfoAsync(audioUri);
          if (info.exists) {
            const tempUri = FileSystem.cacheDirectory + `alarm_play_${Date.now()}.wav`;
            await FileSystem.copyAsync({ from: audioUri, to: tempUri });
            const { sound } = await Audio.Sound.createAsync({ uri: tempUri });
            soundToPlay = sound;
          } else {
            console.warn('[AlarmScreen] Audio file missing, falling back');
            const { sound } = await Audio.Sound.createAsync(require('@/assets/sounds/test_alarm.wav'));
            soundToPlay = sound;
          }
        } else {
          const { sound } = await Audio.Sound.createAsync(require('@/assets/sounds/test_alarm.wav'));
          soundToPlay = sound;
        }

        if (!mounted) {
          await soundToPlay.unloadAsync();
          return;
        }

        soundRef.current = soundToPlay;
        await soundToPlay.setIsLoopingAsync(true);
        await soundToPlay.setVolumeAsync(1.0);
        await soundToPlay.playAsync();
      } catch (error) {
        console.error('[AlarmScreen] Failed to play audio:', error);
      }
    })();

    return () => {
      mounted = false;
      if (soundRef.current) {
        soundRef.current.stopAsync().catch(() => {});
        soundRef.current.unloadAsync().catch(() => {});
      }
    };
  }, [alarmId]);

  const handleStop = useCallback(async () => {
    setIsStopped(true);
    if (soundRef.current) {
      try {
        await soundRef.current.stopAsync();
        await soundRef.current.unloadAsync();
      } catch {}
      soundRef.current = null;
    }
    await notifee.cancelAllNotifications();
  }, []);

  const STATUS_BAR_HEIGHT = Platform.OS === 'android' ? StatusBar.currentHeight || 0 : 0;

  if (isStopped) {
    return (
      <View style={[styles.container, styles.stoppedContainer]}>
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
        <View style={{ height: STATUS_BAR_HEIGHT + 60 }} />
        <ScrollView contentContainerStyle={styles.stoppedContent}>
          <ThemedText style={styles.stoppedEmoji}>☀️</ThemedText>
          <ThemedText style={styles.stoppedText}>早安！新的一天开始了</ThemedText>
          <ThemedText style={styles.stoppedSubtext}>闹钟已关闭，祝你今天过得精彩</ThemedText>
          {onClose && (
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <ThemedText style={styles.closeBtnText}>进入应用</ThemedText>
            </TouchableOpacity>
          )}
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <View style={{ height: STATUS_BAR_HEIGHT + 60 }} />
      
      <ScrollView contentContainerStyle={styles.content}>
        {/* Time */}
        <ThemedText 
          style={styles.time} 
          numberOfLines={1} 
          adjustsFontSizeToFit
        >
          {currentTime}
        </ThemedText>

        {/* Alert indicator */}
        <View style={styles.alertBox}>
          <ThemedText style={styles.alertEmoji}>🔔</ThemedText>
          <ThemedText style={styles.alertText} numberOfLines={1}>Wake up dude!</ThemedText>
          <ThemedText style={styles.alertSubtext} numberOfLines={2} adjustsFontSizeToFit>
            {persona} 专属语音正在播放…
          </ThemedText>
        </View>
      </ScrollView>

      {/* Swipe to stop */}
      <View style={styles.swipeArea}>
        <SwipeToStop onStop={handleStop} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a1a',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight || 0 : 0,
    paddingBottom: 40, // General safety buffer for bottom home indicator
  },
  stoppedContainer: {
    backgroundColor: '#1a1a2e',
  },
  time: {
    fontSize: 90,
    fontWeight: '200',
    color: '#ffffff',
    letterSpacing: 2,
    textAlign: 'center',
    width: '100%',
    lineHeight: undefined, 
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center', // User's preferred centered look
    paddingHorizontal: 32,
  },
  stoppedContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center', // User's preferred centered look
    paddingHorizontal: 32,
  },
  alertBox: {
    alignItems: 'center',
    marginTop: 40,
    width: '100%',
  },
  alertEmoji: {
    fontSize: 54,
    marginBottom: 20,
    color: '#ffffff',
    lineHeight: undefined,
  },
  alertText: {
    fontSize: 28,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 10,
    textAlign: 'center',
    lineHeight: undefined,
  },
  alertSubtext: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    width: '100%',
    lineHeight: undefined,
  },
  swipeArea: {
    height: 100,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  stoppedEmoji: {
    fontSize: 64,
    marginBottom: 20,
    color: '#ffffff',
    lineHeight: undefined,
  },
  stoppedText: {
    fontSize: 28,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 8,
    lineHeight: undefined,
  },
  stoppedSubtext: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.5)',
    marginBottom: 40,
    lineHeight: undefined,
  },
  closeBtn: {
    paddingHorizontal: 32,
    paddingVertical: 16,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 28,
  },
  closeBtnText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
    lineHeight: undefined,
  },
});

export default AlarmScreenComponent;
