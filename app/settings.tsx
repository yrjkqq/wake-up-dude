import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, Alert, Linking, Text, Modal, FlatList } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { clearAllHistory, getDebugLogs, clearDebugLogs, DebugLog } from '@/services/database';
import { getScheduledAlarms } from '@/services/notification-service';
import * as FileSystem from 'expo-file-system/legacy';

const PERSONAS = [
  '🌸 温柔女友',
  '👺 毒舌监督员',
  '💂 军训教官',
  '🐱 傲娇猫咪',
];
const TEXT_MODELS = ['gemini-3.1-pro-preview', 'gemini-2.5-flash'];
const TTS_MODELS = ['gemini-2.5-pro-preview-tts', 'gemini-2.5-flash-preview-tts'];

const SelectorBlock = ({ title, options, currentVal, setVal, k, colors }: any) => {
  const saveSetting = async (key: string, val: string, setter: any) => {
    setter(val);
    await AsyncStorage.setItem(key, val);
  };
  return (
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
};

const LEVEL_COLORS: Record<string, string> = {
  info: '#22C55E',
  warn: '#F59E0B',
  error: '#EF4444',
};

function formatLogTime(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export default function Settings() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  
  const [persona, setPersona] = useState(PERSONAS[2]);
  const [textModel, setTextModel] = useState(TEXT_MODELS[0]);
  const [ttsModel, setTtsModel] = useState(TTS_MODELS[0]);
  const [showDebugLogs, setShowDebugLogs] = useState(false);
  const [debugLogs, setDebugLogs] = useState<DebugLog[]>([]);

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

  const handleShowScheduled = async () => {
    try {
      const ids = await getScheduledAlarms();
      if (ids.length === 0) {
        Alert.alert('已排期的闹钟', '当前没有任何已排期的通知触发器。');
      } else {
        Alert.alert(
          '已排期的闹钟',
          `共 ${ids.length} 个触发器:\n\n${ids.map(id => `• ${id}`).join('\n')}`,
        );
      }
    } catch (e) {
      Alert.alert('查询失败', String(e));
    }
  };

  const handleShowDebugLogs = useCallback(() => {
    const logs = getDebugLogs(200);
    setDebugLogs(logs);
    setShowDebugLogs(true);
  }, []);

  const handleClearDebugLogs = useCallback(() => {
    Alert.alert('清空调试日志', '确定要清空所有调试日志吗？', [
      { text: '取消', style: 'cancel' },
      { text: '清空', style: 'destructive', onPress: () => {
        clearDebugLogs();
        setDebugLogs([]);
      }},
    ]);
  }, []);

  const renderLogItem = useCallback(({ item }: { item: DebugLog }) => (
    <View style={[logStyles.logItem, { borderLeftColor: LEVEL_COLORS[item.level] || '#666' }]}>
      <View style={logStyles.logHeader}>
        <Text style={[logStyles.logTag, { color: colors.tint }]}>{item.tag}</Text>
        <Text style={logStyles.logTime}>{formatLogTime(item.timestamp)}</Text>
      </View>
      <Text style={[logStyles.logMessage, { color: colors.text }]}>{item.message}</Text>
    </View>
  ), [colors]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: Spacing.md }}>
        <ThemedText style={styles.title}>全局设置选项</ThemedText>
        
        <View style={styles.card}>
          <SelectorBlock title="🎭 默认人设 (用于新闹钟)" options={PERSONAS} currentVal={persona} setVal={setPersona} k="SETTINGS_PERSONA" colors={colors} />
          <SelectorBlock title="🧠 大脑: 文本生成模型" options={TEXT_MODELS} currentVal={textModel} setVal={setTextModel} k="SETTINGS_TEXT_MODEL" colors={colors} />
          <SelectorBlock title="🎤 嘴嘴: 语音发音机制" options={TTS_MODELS} currentVal={ttsModel} setVal={setTtsModel} k="SETTINGS_TTS_MODEL" colors={colors} />
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

        {/* Debug & Diagnostics Section */}
        <ThemedText style={[styles.title, { marginTop: Spacing.xl, fontSize: 18 }]}>🔧 调试诊断</ThemedText>
        <View style={styles.card}>
          <TouchableOpacity style={styles.listItem} onPress={handleShowScheduled}>
            <Ionicons name="alarm-outline" size={22} color={colors.text} />
            <ThemedText style={{ flex: 1, marginLeft: 12 }}>查看已排期的闹钟触发器</ThemedText>
            <Ionicons name="chevron-forward" size={20} color={colors.border} />
          </TouchableOpacity>
          <View style={{ height: 1, backgroundColor: colors.border, marginVertical: 8 }} />
          <TouchableOpacity style={styles.listItem} onPress={handleShowDebugLogs}>
            <Ionicons name="document-text-outline" size={22} color={colors.text} />
            <ThemedText style={{ flex: 1, marginLeft: 12 }}>查看调试日志</ThemedText>
            <Ionicons name="chevron-forward" size={20} color={colors.border} />
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Debug Logs Modal */}
      <Modal visible={showDebugLogs} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={[logStyles.modal, { backgroundColor: colors.background }]}>
          <View style={logStyles.modalHeader}>
            <ThemedText style={{ fontSize: 20, fontWeight: 'bold' }}>调试日志</ThemedText>
            <View style={{ flexDirection: 'row', gap: 16 }}>
              <TouchableOpacity onPress={handleClearDebugLogs}>
                <Ionicons name="trash-outline" size={22} color={colors.danger} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setShowDebugLogs(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
          </View>
          {debugLogs.length === 0 ? (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
              <ThemedText style={{ color: colors.textSecondary }}>暂无调试日志</ThemedText>
            </View>
          ) : (
            <FlatList
              data={debugLogs}
              keyExtractor={(item) => item.id.toString()}
              renderItem={renderLogItem}
              contentContainerStyle={{ padding: Spacing.md }}
            />
          )}
        </SafeAreaView>
      </Modal>
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

const logStyles = StyleSheet.create({
  modal: { flex: 1 },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(100,100,100,0.2)',
  },
  logItem: {
    borderLeftWidth: 3,
    paddingLeft: 10,
    paddingVertical: 8,
    marginBottom: 8,
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  logTag: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'monospace',
  },
  logTime: {
    fontSize: 11,
    color: '#71717A',
    fontFamily: 'monospace',
  },
  logMessage: {
    fontSize: 13,
    lineHeight: 18,
  },
});
