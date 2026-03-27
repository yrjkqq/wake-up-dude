import React, { useState, useCallback, useEffect } from 'react';
import {
  StyleSheet,
  View,
  FlatList,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { getAlarms, addAlarm, updateAlarm, deleteAlarm, toggleAlarm, Alarm } from '@/services/database';
import { scheduleAlarm, cancelAlarm } from '@/services/notification-service';
import { AlarmEditModal } from '@/components/AlarmEditModal';

export default function AlarmListScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const [alarms, setAlarms] = useState<Alarm[]>([]);
  const [editingAlarm, setEditingAlarm] = useState<Alarm | undefined>(undefined);
  const [isModalVisible, setIsModalVisible] = useState(false);

  const loadAlarms = useCallback(() => {
    const data = getAlarms();
    setAlarms(data);
  }, []);

  useEffect(() => {
    loadAlarms();
  }, [loadAlarms]);

  const handleToggle = async (alarm: Alarm, value: boolean) => {
    toggleAlarm(alarm.id, value);
    const updatedAlarm = { ...alarm, enabled: value };
    
    if (value) {
      await scheduleAlarm(updatedAlarm);
    } else {
      await cancelAlarm(alarm.id);
    }
    loadAlarms();
  };

  const handleDelete = (id: number) => {
    Alert.alert('删除闹钟', '确定要删除这个闹钟吗？', [
      { text: '取消', style: 'cancel' },
      {
        text: '删除',
        style: 'destructive',
        onPress: async () => {
          await cancelAlarm(id);
          deleteAlarm(id);
          loadAlarms();
        },
      },
    ]);
  };

  const handleSaveAlarm = async (time: string, persona: string) => {
    const days = JSON.stringify([0,1,2,3,4,5,6]); // Default all days
    if (editingAlarm) {
      updateAlarm(editingAlarm.id, time, days, persona);
      const updated = { ...editingAlarm, time, persona, days };
      if (updated.enabled) await scheduleAlarm(updated);
    } else {
      const id = addAlarm(time, days, persona);
      const newAlarm: Alarm = { id, time, days, persona, enabled: true, lastAudioUri: null };
      await scheduleAlarm(newAlarm);
    }
    setIsModalVisible(false);
    setEditingAlarm(undefined);
    loadAlarms();
  };

  const renderItem = ({ item }: { item: Alarm }) => (
    <TouchableOpacity
      style={[styles.alarmItem, { backgroundColor: colors.surface, borderColor: colors.border }]}
      onPress={() => {
        setEditingAlarm(item);
        setIsModalVisible(true);
      }}
    >
      <View style={styles.alarmInfo}>
        <ThemedText style={styles.alarmTime}>{item.time}</ThemedText>
        <ThemedText style={[styles.alarmSub, { color: colors.textSecondary }]}>
          {item.persona} • 每天
        </ThemedText>
      </View>
      <View style={styles.alarmActions}>
        <Switch
          value={item.enabled}
          onValueChange={(val) => handleToggle(item, val)}
          trackColor={{ true: colors.tint }}
        />
        <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(item.id)}>
          <Ionicons name="trash-outline" size={20} color={colors.icon} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={styles.header}>
        <ThemedText style={styles.title}>闹钟</ThemedText>
        <TouchableOpacity
          onPress={() => {
            setEditingAlarm(undefined);
            setIsModalVisible(true);
          }}
        >
          <Ionicons name="add" size={32} color={colors.tint} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={alarms}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderItem}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={() => (
          <View style={styles.emptyState}>
            <ThemedText style={{ color: colors.textSecondary }}>还没有闹钟哦，点击右上角添加吧</ThemedText>
          </View>
        )}
      />

      <AlarmEditModal
        visible={isModalVisible}
        alarm={editingAlarm}
        onClose={() => {
          setIsModalVisible(false);
          setEditingAlarm(undefined);
        }}
        onSave={handleSaveAlarm}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
  },
  listContainer: {
    padding: Spacing.lg,
    paddingBottom: 100,
  },
  alarmItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.lg,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: Spacing.md,
  },
  alarmInfo: {
    flex: 1,
  },
  alarmTime: {
    fontSize: 32,
    fontWeight: '300',
  },
  alarmSub: {
    fontSize: 14,
    marginTop: 4,
  },
  alarmActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  deleteBtn: {
    padding: 4,
  },
  emptyState: {
    marginTop: 100,
    alignItems: 'center',
  },
});
