import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { StyleSheet, View, Platform, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import { AlarmButton } from '@/components/alarm-button';
import { ThemedText } from '@/components/themed-text';
import { Colors, Fonts, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import {
  initNotifications,
  requestPermissions,
  scheduleAlarm,
  cancelAllAlarms,
} from '@/services/notification-service';

function padZero(n: number): string {
  return n.toString().padStart(2, '0');
}

export default function AlarmScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  // Default alarm time: 08:00
  const [alarmTime, setAlarmTime] = useState(() => {
    const d = new Date();
    d.setHours(8, 0, 0, 0);
    return d;
  });
  const [isAlarmActive, setIsAlarmActive] = useState(false);
  const [showPicker, setShowPicker] = useState(Platform.OS === 'ios');
  const [statusMessage, setStatusMessage] = useState('');

  const timeString = useMemo(() => {
    return `${padZero(alarmTime.getHours())}:${padZero(alarmTime.getMinutes())}`;
  }, [alarmTime]);

  // Initialize notifications on mount
  useEffect(() => {
    initNotifications();
  }, []);

  const handleTimeChange = useCallback(
    (_event: DateTimePickerEvent, selectedDate?: Date) => {
      if (Platform.OS === 'android') {
        setShowPicker(false);
      }
      if (selectedDate) {
        setAlarmTime(selectedDate);
      }
    },
    [],
  );

  const toggleAlarm = useCallback(async () => {
    if (isAlarmActive) {
      // Cancel alarm
      await cancelAllAlarms();
      setIsAlarmActive(false);
      setStatusMessage('');
    } else {
      // Request permissions first
      const granted = await requestPermissions();
      if (!granted) {
        Alert.alert('权限不足', '需要通知权限才能设定闹钟，请在设置中开启。');
        return;
      }

      // Schedule alarm
      try {
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
        setStatusMessage(`${diffH}小时${diffM}分钟后响铃`);
      } catch (error) {
        console.error('Failed to schedule alarm:', error);
        Alert.alert('设定失败', '闹钟设定出现问题，请重试。');
      }
    }
  }, [isAlarmActive, alarmTime]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
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
        {Platform.OS !== 'ios' && (
          <ThemedText
            style={[styles.timeDisplay, { color: colors.text, fontFamily: Fonts?.mono }]}
            onPress={() => !isAlarmActive && setShowPicker(true)}>
            {timeString}
          </ThemedText>
        )}

        {/* DateTimePicker */}
        {showPicker && (
          <DateTimePicker
            value={alarmTime}
            mode="time"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={handleTimeChange}
            textColor={colors.text}
            disabled={isAlarmActive}
            locale="zh-CN"
            style={Platform.OS === 'ios' ? styles.iosPicker : undefined}
          />
        )}

        {isAlarmActive && (
          <Animated.View entering={FadeIn.duration(400)} exiting={FadeOut.duration(300)}>
            <ThemedText style={[styles.activeHint, { color: colors.success }]}>
              ✅ 闹钟将在 {timeString} 响起
            </ThemedText>
            {statusMessage !== '' && (
              <ThemedText style={[styles.countdownHint, { color: colors.textSecondary }]}>
                {statusMessage}
              </ThemedText>
            )}
          </Animated.View>
        )}
      </View>

      {/* Alarm Button */}
      <View style={styles.buttonArea}>
        <AlarmButton isActive={isAlarmActive} onPress={toggleAlarm} />
      </View>

      {/* Footer hint */}
      <ThemedText style={[styles.footerHint, { color: colors.textSecondary }]}>
        {isAlarmActive
          ? '💤 安心入睡吧，AI 已经准备好叫醒你了'
          : '💡 设定时间后点击开启，AI 会为你生成专属叫醒语音'}
      </ThemedText>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: Spacing.xl,
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
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
});
