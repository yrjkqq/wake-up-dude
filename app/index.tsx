import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { StyleSheet, View, Platform, Alert, Linking, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DatePicker from '@/components/time-picker';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import { AlarmButton } from '@/components/alarm-button';
import SwipeToStop from '@/components/SwipeToStop';
import { ThemedText } from '@/components/themed-text';
import { Colors, Fonts, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import {
  initNotifications,
  requestPermissions,
  scheduleAlarm,
  cancelAllAlarms,
  checkAlarmSoundEnabled,
  checkExactAlarmPermission,
  openAlarmSettings,
} from '@/services/notification-service';
import { generateAlarmAudio, checkHasLatestAlarm } from '@/services/ai-service';
import notifee, { EventType } from '@notifee/react-native';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system/legacy';
import AsyncStorage from '@react-native-async-storage/async-storage';

function padZero(n: number): string {
  return n.toString().padStart(2, '0');
}


export default function AlarmScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  // Default alarm time: 08:00
  const [alarmTime, setAlarmTime] = useState(() => {
    const d = new Date();
    d.setMinutes(d.getMinutes() + 1);
    d.setSeconds(0, 0);
    return d;
  });
  const [isAlarmActive, setIsAlarmActive] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const [activeWaitModel, setActiveWaitModel] = useState('Gemini 3.1 Pro');
  
  const soundRef = React.useRef<Audio.Sound | null>(null);

  const timeString = useMemo(() => {
    return `${padZero(alarmTime.getHours())}:${padZero(alarmTime.getMinutes())}`;
  }, [alarmTime]);

  // Initialize notifications on mount
  useEffect(() => {
    async function setup() {
      await initNotifications();
      // Request system permissions directly on startup
      await requestPermissions();
      
      // Setup audio session
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
      });
    }
    setup();
  }, []);

  const playAlarmAudio = useCallback(async (isRealAlarm = false) => {
    try {
      const uri = await checkHasLatestAlarm();
      let playUri = uri;
      
      if (!uri) {
        const fallbackSet = await AsyncStorage.getItem('LATEST_ALARM_FILE_URI');
        if (fallbackSet === 'fallback') {
           playUri = 'fallback';
        } else {
           Alert.alert('Play Error', '未找到之前生成的 AI 闹钟缓存录音，并且无离线兜底可用！');
           return;
        }
      }
      
      let soundToPlay;
      if (playUri === 'fallback') {
        const { sound } = await Audio.Sound.createAsync(require('@/assets/sounds/test_alarm.wav'));
        soundToPlay = sound;
      } else {
        const tempUri = FileSystem.cacheDirectory + `temp_play_${Date.now()}.wav`;
        await FileSystem.copyAsync({ from: playUri as string, to: tempUri });
        const { sound } = await Audio.Sound.createAsync({ uri: tempUri });
        soundToPlay = sound;
      }
      
      soundToPlay.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          setIsPlayingPreview(false);
        }
      });
      
      soundRef.current = soundToPlay;
      setIsPlayingPreview(true);
      await soundToPlay.setIsLoopingAsync(isRealAlarm === true);
      await soundToPlay.playAsync();
    } catch (e) {
      console.error('Audio playback failed', e);
      Alert.alert('播放器抛出底层异常', String(e));
      setIsPlayingPreview(false);
    }
  }, []);

  const stopAudio = useCallback(async () => {
    setIsPlayingPreview(false);
    if (soundRef.current) {
      await soundRef.current.stopAsync();
      await soundRef.current.unloadAsync();
      soundRef.current = null;
    }
  }, []);

  // Notifee foreground event listener — handles alarm arriving while app is open
  useEffect(() => {
    return notifee.onForegroundEvent(async ({ type, detail }) => {
      if (type === EventType.DELIVERED) {
        // Cancel the notification immediately to stop the channel's system sound —
        // expo-av will play the AI audio instead
        if (detail.notification?.id) {
          await notifee.cancelNotification(detail.notification.id);
        }
        playAlarmAudio(true);
        setStatusMessage('🔔 闹钟正在响，右滑底栏彻底关闭！');
      }
      if (type === EventType.PRESS) {
        playAlarmAudio(true);
        setStatusMessage('🔔 闹钟正在响，右滑底栏彻底关闭！');
      }
    });
  }, [playAlarmAudio]);

  const toggleAlarm = useCallback(async () => {
    if (isAlarmActive || isGenerating) {
      // Cancel alarm
      await cancelAllAlarms();
      setIsAlarmActive(false);
      setStatusMessage('');
      stopAudio();
    } else {
      // Verify notification permissions
      const granted = await requestPermissions();
      if (!granted) {
        Alert.alert(
          '权限不足',
          '需要通知权限才能设定闹钟，请在系统设置中开启。',
          [
            { text: '取消', style: 'cancel' },
            { text: '去设置', onPress: () => Linking.openSettings() },
          ]
        );
        return;
      }

      // Check exact alarm permission (Android 12+)
      if (Platform.OS === 'android') {
        const alarmAllowed = await checkExactAlarmPermission();
        if (!alarmAllowed) {
          Alert.alert(
            '需要精确闹钟权限',
            'Android 12+ 要求授权"精确闹钟"权限才能保证准时响铃。请在接下来的系统设置页面中开启此权限。',
            [
              { text: '取消', style: 'cancel' },
              { text: '去设置', onPress: openAlarmSettings },
            ]
          );
          return;
        }
      }

      // Check if channel sound is explicitly disabled
      const soundEnabled = await checkAlarmSoundEnabled();
      if (!soundEnabled) {
        Alert.alert(
          '闹钟已被静音',
          '检测到系统通知设置中禁用了闹钟声音。为了能叫醒你，请点击"去设置" -> "通知" -> 找到 "Alarm" 类别，将其设为允许发出声音并提高重要度。',
          [
            { text: '取消', style: 'cancel' },
            { text: '去设置', onPress: () => Linking.openSettings() },
          ]
        );
        return;
      }

      const textModel = await AsyncStorage.getItem('SETTINGS_TEXT_MODEL') || 'gemini-3.1-pro-preview';
      setActiveWaitModel(textModel);

      setIsGenerating(true);
      setStatusMessage('🧠 AI 正在构思叫醒语音...');

      // 1. Schedule alarm FIRST — guarantees it fires even if screen locks during AI generation
      await AsyncStorage.setItem('LATEST_ALARM_FILE_URI', 'fallback'); // default to fallback
      await scheduleAlarm(alarmTime);
      setIsAlarmActive(true);

      // Calculate time until alarm for display
      const now = new Date();
      let target = new Date(alarmTime);
      if (target <= now) {
        target.setDate(target.getDate() + 1);
      }
      const diffMs = target.getTime() - now.getTime();
      const diffH = Math.floor(diffMs / 3600000);
      const diffM = Math.floor((diffMs % 3600000) / 60000);

      // 2. Then try to generate AI audio — if this fails, alarm still fires with fallback
      try {
        const activePersona = await AsyncStorage.getItem('SETTINGS_PERSONA') || '🌸 温柔女友';
        const result = await generateAlarmAudio(timeString, activePersona);
        setStatusMessage(`✅ ${diffH}小时${diffM}分钟后响铃\n\n"${result.text}"`);
      } catch (error) {
        console.error('AI generation failed (alarm still scheduled):', error);
        setStatusMessage(`⚠️ AI 生成失败，已用默认铃声兜底\n✅ ${diffH}小时${diffM}分后保证响铃`);
      } finally {
        setIsGenerating(false);
      }
    }
  }, [isAlarmActive, isGenerating, alarmTime, timeString, stopAudio]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        style={{ flex: 1, width: '100%' }}
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
      {/* Header */}
      <View style={styles.header}>
        <ThemedText style={[styles.appTitle, { color: colors.tint }]}>
          ⏰ Wake up dude
        </ThemedText>
        <ThemedText style={[styles.subtitle, { color: colors.textSecondary }]}>
          AI 智能唤醒闹钟
        </ThemedText>
      </View>

      {/* Time Display */}
      <View style={[styles.timeCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        {!isAlarmActive ? (
          // @ts-ignore
          <DatePicker
            date={alarmTime}
            mode="time"
            onDateChange={setAlarmTime}
            textColor={colors.text}
            fadeToColor="none"
            locale="zh-CN"
            androidVariant="iosClone"
          />
        ) : (
          <ThemedText style={[styles.timeDisplay, { color: colors.text, fontFamily: Fonts?.mono }]}>
            {timeString}
          </ThemedText>
        )}

        {(isAlarmActive || isGenerating) && (
          <Animated.View entering={FadeIn.duration(400)} exiting={FadeOut.duration(300)}>
            {isAlarmActive && !isGenerating && (
              <ThemedText style={[styles.activeHint, { color: colors.success }]}>
                ✅ 闹钟将在 {timeString} 响起
              </ThemedText>
            )}
            {isGenerating && (
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                <ActivityIndicator size="small" color={colors.tint} style={{ marginRight: 8 }} />
                <ThemedText style={{ color: colors.tint, fontSize: 16, fontWeight: '600' }}>
                  🧠 正在连接 {activeWaitModel}...
                </ThemedText>
              </View>
            )}
            {statusMessage !== '' && (
              <ThemedText style={[styles.countdownHint, { color: colors.textSecondary }]}>
                {statusMessage}
              </ThemedText>
            )}
          </Animated.View>
        )}
      </View>

      {/* UI spacing gap placeholder to separate components */}
      <View style={{ height: Spacing.xl }} />

      {/* Preview Voice Button */}
      {isAlarmActive && !isGenerating && statusMessage !== '' && (
        <View style={{ width: '100%', alignItems: 'center', marginBottom: Spacing.xl }}>
          <TouchableOpacity 
            onPress={isPlayingPreview ? stopAudio : () => playAlarmAudio(false)} 
            activeOpacity={0.7} 
            style={{ padding: Spacing.sm }}
          >
            <ThemedText style={{ color: colors.tint, fontSize: 16, textDecorationLine: 'underline' }}>
              {isPlayingPreview ? '⏹ 停止播放' : '🎧 抢先试听生成的专属语音'}
            </ThemedText>
          </TouchableOpacity>
        </View>
      )}

      {/* Alarm Button / Swipe Stop */}
      <View style={styles.buttonArea}>
        {isAlarmActive ? (
          <SwipeToStop onStop={toggleAlarm} />
        ) : (
          <AlarmButton isActive={false} onPress={toggleAlarm} />
        )}
      </View>

      {/* Footer hint */}
      <ThemedText style={[styles.footerHint, { color: colors.textSecondary }]}>
        {isAlarmActive
          ? '💤 安心入睡吧，AI 已经准备好叫醒你了'
          : '💡 设定时间后点击开启，AI 会为你生成专属叫醒语音'}
      </ThemedText>

      {/* System Settings Link for Android */}
      {Platform.OS === 'android' && (
        <TouchableOpacity style={styles.settingsLink} onPress={() => Linking.openSettings()}>
          <ThemedText style={[styles.settingsText, { color: colors.textSecondary }]}>
            🔕 闹钟没声音？去系统设置检查通知权限
          </ThemedText>
        </TouchableOpacity>
      )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    paddingTop: Spacing.xl,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xxl * 2,
    alignItems: 'center',
    flexGrow: 1,
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  appTitle: {
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: 0.5,
    lineHeight: 44,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '500',
    marginTop: Spacing.xs,
  },
  timeCard: {
    width: '100%',
    borderRadius: 24,
    borderWidth: 1,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.md,
    alignItems: 'center',
    marginBottom: Spacing.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  timeDisplay: {
    fontSize: 72,
    fontWeight: '200',
    letterSpacing: 4,
    marginBottom: Spacing.md,
    lineHeight: 84,
    includeFontPadding: false,
  },
  iosPicker: {
    height: 180,
    width: '100%',
  },
  activeHint: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: Spacing.md,
    textAlign: 'center',
  },
  countdownHint: {
    fontSize: 14,
    fontWeight: '400',
    marginTop: Spacing.xs,
    textAlign: 'center',
  },
  buttonArea: {
    width: '100%',
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.lg,
  },
  footerHint: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: Spacing.lg,
  },
  settingsLink: {
    marginTop: Spacing.xl,
    padding: Spacing.sm,
  },
  settingsText: {
    fontSize: 13,
    textDecorationLine: 'underline',
    textAlign: 'center',
    opacity: 0.8,
  },
  personaContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  personaRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  personaChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: 20,
    borderWidth: 1,
  },
});
