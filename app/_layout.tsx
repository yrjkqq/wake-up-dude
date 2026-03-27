import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Tabs } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { useEffect, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';
import { initDB } from '@/services/database';
import { useColorScheme } from '@/hooks/use-color-scheme';
import notifee, { EventType } from '@notifee/react-native';
import { Modal, AppState } from 'react-native';

import AlarmScreenComponent from '@/components/AlarmScreen';

// Handle Notifee events when app is in background or killed state
notifee.onBackgroundEvent(async ({ type, detail }) => {
  if (type === EventType.PRESS || type === EventType.ACTION_PRESS) {
    console.log('[Notifee Background] Event:', type, detail.notification?.id);
  }
});

function TabBarIcon(props: { name: React.ComponentProps<typeof Ionicons>['name']; color: string }) {
  return <Ionicons size={28} style={{ marginBottom: -3 }} {...props} />;
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [isShowingAlarm, setIsShowingAlarm] = useState(false);
  const [selectedAlarmId, setSelectedAlarmId] = useState<number | undefined>(undefined);

  useEffect(() => {
    try { initDB(); } catch(e) { console.error('SQLite Init Error:', e); }

    const checkAlarmState = async () => {
      // 1. Check for cold start from alarm
      const initial = await notifee.getInitialNotification();
      if (initial?.notification?.android?.category === 'alarm') {
        const aid = initial.notification.data?.alarmId;
        if (typeof aid === 'string') setSelectedAlarmId(parseInt(aid, 10));
        
        setIsShowingAlarm(true);
        if (initial.notification.id) {
          await notifee.cancelNotification(initial.notification.id);
        }
        return;
      }

      // 2. Check currently displayed notifications
      const displayed = await notifee.getDisplayedNotifications();
      const alarmNotif = displayed.find(n => n.notification.android?.category === 'alarm');
      if (alarmNotif) {
        const aid = alarmNotif.notification.data?.alarmId;
        if (typeof aid === 'string') setSelectedAlarmId(parseInt(aid, 10));

        setIsShowingAlarm(true);
        if (alarmNotif.id) {
          await notifee.cancelNotification(alarmNotif.id);
        }
      }
    };

    // Check immediately on mount
    checkAlarmState();

    // Check whenever app comes to foreground (e.g. MainActivity launched by fullScreenAction intent)
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        checkAlarmState();
      }
    });

    // Handle alarm firing while app is already actively open
    const unsubscribeForeground = notifee.onForegroundEvent(async ({ type, detail }) => {
      if (
        (type === EventType.DELIVERED || type === EventType.PRESS) &&
        detail.notification?.android?.category === 'alarm'
      ) {
        const aid = detail.notification.data?.alarmId;
        if (typeof aid === 'string') setSelectedAlarmId(parseInt(aid, 10));

        setIsShowingAlarm(true);
        if (detail.notification.id) {
          await notifee.cancelNotification(detail.notification.id);
        }
      }
    });

    return () => {
      subscription.remove();
      unsubscribeForeground();
    };
  }, []);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Tabs screenOptions={{ 
        headerShown: false, 
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint 
      }}>
        <Tabs.Screen name="index" options={{ title: '闹钟', tabBarIcon: ({ color }) => <TabBarIcon name="time" color={color} /> }} />
        <Tabs.Screen name="history" options={{ title: '历史', tabBarIcon: ({ color }) => <TabBarIcon name="list" color={color} /> }} />
        <Tabs.Screen name="settings" options={{ title: '设置', tabBarIcon: ({ color }) => <TabBarIcon name="settings" color={color} /> }} />
      </Tabs>
      <StatusBar style="auto" />

      {/* Render AlarmScreen over the entire app when alarm triggers */}
      <Modal visible={isShowingAlarm} animationType="fade" transparent={false}>
        <AlarmScreenComponent 
          alarmId={selectedAlarmId}
          onClose={() => setIsShowingAlarm(false)} 
        />
      </Modal>
    </ThemeProvider>
  );
}
