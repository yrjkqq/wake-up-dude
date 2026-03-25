import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Tabs } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';
import { initDB } from '@/services/database';

function TabBarIcon(props: { name: React.ComponentProps<typeof Ionicons>['name']; color: string }) {
  return <Ionicons size={28} style={{ marginBottom: -3 }} {...props} />;
}

import { useColorScheme } from '@/hooks/use-color-scheme';

export default function RootLayout() {
  const colorScheme = useColorScheme();

  useEffect(() => {
    try { initDB(); } catch(e) { console.error('SQLite Init Error:', e); }
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
    </ThemeProvider>
  );
}
