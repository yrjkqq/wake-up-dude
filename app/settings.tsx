import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, Alert, Linking } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { clearAllHistory } from '@/services/database';
import * as FileSystem from 'expo-file-system/legacy';

const PERSONAS = ['🔥 毒舌监督员', '💪 军训教官', '🌸 温柔女友', '💼 社畜互助'];
const TEXT_MODELS = ['gemini-3.1-pro-preview', 'gemini-2.5-flash'];
const TTS_MODELS = ['gemini-2.5-pro-preview-tts', 'gemini-2.5-flash-preview-tts'];

export default function Settings() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  
  const [persona, setPersona] = useState(PERSONAS[2]);
  const [textModel, setTextModel] = useState(TEXT_MODELS[0]);
  const [ttsModel, setTtsModel] = useState(TTS_MODELS[0]);

  useEffect(() => {
    async function load() {
      const p = await AsyncStorage.getItem('SETTINGS_PERSONA');
      const tm = await AsyncStorage.getItem('SETTINGS_TEXT_MODEL');
      const ttsm = await AsyncStorage.getItem('SETTINGS_TTS_MODEL');
      if (p) setPersona(p);
      if (tm) setTextModel(tm);
      if (ttsm) setTtsModel(ttsm);
    }
    load();
  }, []);

  const saveSetting = async (key: string, val: string, setter: any) => {
    setter(val);
    await AsyncStorage.setItem(key, val);
  };

  const handleClearCache = async () => {
    Alert.alert('清空所有历史记录', '确定要删除所有的叫醒语音吗？此操作将清理本地数据库和缓存目录，不可逆转。', [
      { text: '取消', style: 'cancel' },
      { text: '一键清空', style: 'destructive', onPress: async () => {
          try {
            clearAllHistory();
            const docs = await FileSystem.readDirectoryAsync(FileSystem.documentDirectory as string);
            for (const file of docs) {
              if (file.startsWith('ai_alarm_') || file.includes('latest_alarm')) {
                await FileSystem.deleteAsync(FileSystem.documentDirectory + file, { idempotent: true });
              }
            }
            Alert.alert('✅ 清理完成');
          } catch(e) {
            Alert.alert('清理失败', String(e));
          }
      }}
    ]);
  };

  const SelectorBlock = ({ title, options, currentVal, setVal, k }: any) => (
    <View style={styles.block}>
      <ThemedText style={{ fontWeight: 'bold', marginBottom: Spacing.sm, color: colors.text }}>{title}</ThemedText>
      <View style={styles.chipRow}>
        {options.map((opt: string) => (
          <TouchableOpacity
            key={opt}
            onPress={() => saveSetting(k, opt, setVal)}
            style={[
              styles.chip,
              { backgroundColor: currentVal === opt ? colors.tint : 'transparent', borderColor: currentVal === opt ? colors.tint : colors.border }
            ]}
          >
            <ThemedText style={{ color: currentVal === opt ? colors.background : colors.text, fontSize: 13 }}>{opt}</ThemedText>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: Spacing.md }}>
        <ThemedText style={styles.title}>全局设置选项</ThemedText>
        
        <View style={styles.card}>
          <SelectorBlock title="🎭 叫醒人设选择" options={PERSONAS} currentVal={persona} setVal={setPersona} k="SETTINGS_PERSONA" />
          <SelectorBlock title="🧠 大脑: 文本生成模型" options={TEXT_MODELS} currentVal={textModel} setVal={setTextModel} k="SETTINGS_TEXT_MODEL" />
          <SelectorBlock title="🎤 嘴嘴: 语音发音机制" options={TTS_MODELS} currentVal={ttsModel} setVal={setTtsModel} k="SETTINGS_TTS_MODEL" />
        </View>

        <View style={[styles.card, { marginTop: Spacing.lg }]}>
          <TouchableOpacity style={styles.listItem} onPress={() => Linking.openSettings()}>
            <Ionicons name="notifications-outline" size={22} color={colors.text} />
            <ThemedText style={{ flex: 1, marginLeft: 12 }}>前往手机系统设置调整通知权限</ThemedText>
            <Ionicons name="chevron-forward" size={20} color={colors.border} />
          </TouchableOpacity>
          <View style={{ height: 1, backgroundColor: colors.border, marginVertical: 8 }} />
          <TouchableOpacity style={styles.listItem} onPress={handleClearCache}>
            <Ionicons name="trash-bin-outline" size={22} color={colors.danger} />
            <ThemedText style={{ flex: 1, marginLeft: 12, color: colors.danger }}>清空所有本地历史语音和记录</ThemedText>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: Spacing.md },
  card: { backgroundColor: 'rgba(100,100,100, 0.05)', borderRadius: 12, padding: Spacing.md },
  block: { marginBottom: Spacing.lg },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1, borderRadius: 20, paddingVertical: 6, paddingHorizontal: 12 },
  listItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 }
});
