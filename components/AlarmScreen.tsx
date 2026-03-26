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
import { View, StyleSheet, StatusBar, TouchableOpacity } from 'react-native';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system/legacy';
import AsyncStorage from '@react-native-async-storage/async-storage';
import notifee from '@notifee/react-native';

import SwipeToStop from '@/components/SwipeToStop';
import { ThemedText } from '@/components/themed-text';
import { LATEST_ALARM_KEY } from '@/services/ai-service';

interface Props {
  onClose?: () => void;
}

function AlarmScreenComponent({ onClose }: Props) {
  const soundRef = useRef<Audio.Sound | null>(null);
  const [currentTime, setCurrentTime] = useState('');
  const [isStopped, setIsStopped] = useState(false);

  // Tick the clock display
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Auto-play audio on mount
  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          staysActiveInBackground: true,
        });

        const uri = await AsyncStorage.getItem(LATEST_ALARM_KEY);
        let soundToPlay: Audio.Sound;

        if (uri && uri !== 'fallback') {
          const info = await FileSystem.getInfoAsync(uri);
          if (info.exists) {
            const tempUri = FileSystem.cacheDirectory + `alarm_play_${Date.now()}.wav`;
            await FileSystem.copyAsync({ from: uri, to: tempUri });
            const { sound } = await Audio.Sound.createAsync({ uri: tempUri });
            soundToPlay = sound;
          } else {
            const { sound } = await Audio.Sound.createAsync(
              require('@/assets/sounds/test_alarm.wav')
            );
            soundToPlay = sound;
          }
        } else {
          const { sound } = await Audio.Sound.createAsync(
            require('@/assets/sounds/test_alarm.wav')
          );
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
  }, []);

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

  if (isStopped) {
    return (
      <View style={[styles.container, styles.stoppedContainer]}>
        <StatusBar barStyle="light-content" backgroundColor="#1a1a2e" />
        <ThemedText style={styles.stoppedEmoji}>☀️</ThemedText>
        <ThemedText style={styles.stoppedText}>早安！新的一天开始了</ThemedText>
        <ThemedText style={styles.stoppedSubtext}>闹钟已关闭，祝你今天过得精彩</ThemedText>
        {onClose && (
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <ThemedText style={styles.closeBtnText}>进入应用</ThemedText>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0a0a1a" />

      {/* Time */}
      <ThemedText style={styles.time}>{currentTime}</ThemedText>

      {/* Alert indicator */}
      <View style={styles.alertBox}>
        <ThemedText style={styles.alertEmoji}>🔔</ThemedText>
        <ThemedText style={styles.alertText}>Wake up dude!</ThemedText>
        <ThemedText style={styles.alertSubtext}>
          AI 专属语音正在播放...
        </ThemedText>
      </View>

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
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  stoppedContainer: {
    backgroundColor: '#1a1a2e',
  },
  time: {
    fontSize: 80,
    fontWeight: '100',
    color: '#ffffff',
    letterSpacing: 4,
    marginBottom: 40,
  },
  alertBox: {
    alignItems: 'center',
    marginBottom: 60,
  },
  alertEmoji: {
    fontSize: 48,
    marginBottom: 16,
    color: '#ffffff',
  },
  alertText: {
    fontSize: 28,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 8,
  },
  alertSubtext: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.6)',
  },
  swipeArea: {
    position: 'absolute',
    bottom: 80,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  stoppedEmoji: {
    fontSize: 64,
    marginBottom: 20,
    color: '#ffffff',
  },
  stoppedText: {
    fontSize: 28,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 8,
  },
  stoppedSubtext: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.5)',
    marginBottom: 40,
  },
  closeBtn: {
    paddingHorizontal: 32,
    paddingVertical: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 24,
  },
  closeBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default AlarmScreenComponent;
