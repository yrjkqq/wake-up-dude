import React, { useState, useCallback, useEffect } from 'react';
import {
  StyleSheet,
  View,
  FlatList,
  TouchableOpacity,
  Switch,
  Alert,
  Text,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { getAlarms, addAlarm, updateAlarm, deleteAlarm, toggleAlarm, Alarm } from '@/services/database';
import { scheduleAlarm, cancelAlarm } from '@/services/notification-service';
import { AlarmEditModal } from '@/components/AlarmEditModal';

export default function AlarmListScreen() {
  // Enforce pure dark mode aesthetic
  const backgroundColor = '#000000';
  const textColor = '#FFFFFF';
  const textMuted = '#71717A'; // Zinc 500
  const tintColor = '#E85D04';

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
    const days = JSON.stringify([0,1,2,3,4,5,6]);
    if (editingAlarm) {
      updateAlarm(editingAlarm.id, time, days, persona);
      const updated = { ...editingAlarm, time, persona, days };
      if (updated.enabled) await scheduleAlarm(updated);
    } else {
      const id = addAlarm(time, days, persona);
      const newAlarm: Alarm = { id, time, days, persona, enabled: true, lastAudioUri: null, lastText: null };
      await scheduleAlarm(newAlarm);
    }
    setIsModalVisible(false);
    setEditingAlarm(undefined);
    loadAlarms();
  };

  const renderItem = ({ item }: { item: Alarm }) => (
    <TouchableOpacity
      activeOpacity={0.6}
      style={styles.alarmItem}
      onPress={() => {
        setEditingAlarm(item);
        setIsModalVisible(true);
      }}
    >
      <View style={styles.alarmInfo}>
        <Text style={[styles.alarmTime, { color: item.enabled ? textColor : textMuted }]}>
          {item.time}
        </Text>
        <Text style={[styles.alarmSub, { color: textMuted }]}>
          {item.persona} • 每天
        </Text>
      </View>
      <View style={styles.alarmActions}>
        <Switch
          value={item.enabled}
          onValueChange={(val) => handleToggle(item, val)}
          trackColor={{ true: tintColor, false: '#27272A' }}
          thumbColor="#FFFFFF"
          ios_backgroundColor="#27272A"
        />
        <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(item.id)}>
          <Ionicons name="trash-outline" size={20} color="#3F3F46" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor }}>

      <View style={styles.header}>
        <Text style={[styles.title, { color: textColor }]}>Alarms</Text>
        <TouchableOpacity
          hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
          onPress={() => {
            setEditingAlarm(undefined);
            setIsModalVisible(true);
          }}
        >
          <Ionicons name="add" size={36} color={tintColor} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={alarms}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderItem}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={() => (
          <View style={styles.emptyState}>
            <Text style={[styles.emptyStateTitle, { color: textColor }]}>No Alarms</Text>
            <Text style={[styles.emptyStateSub, { color: textMuted }]}>
              Embrace the silence, or set your first wake up call.
            </Text>
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
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 24,
  },
  title: {
    fontSize: 40,
    fontWeight: '800',
    letterSpacing: -1,
  },
  listContainer: {
    paddingHorizontal: 24,
    paddingBottom: 100,
  },
  alarmItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 32,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#18181B', // Very subtle separator underneath to avoid floaty feel, but not a full border box
  },
  alarmInfo: {
    flex: 1,
  },
  alarmTime: {
    fontSize: 72,
    fontWeight: '300',
    letterSpacing: -2,
    lineHeight: 80,
  },
  alarmSub: {
    fontSize: 15,
    fontWeight: '500',
    marginTop: 4,
    letterSpacing: -0.2,
  },
  alarmActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  deleteBtn: {
    padding: 8,
  },
  emptyState: {
    marginTop: 120,
    alignItems: 'flex-start',
  },
  emptyStateTitle: {
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: -0.5,
    marginBottom: 12,
  },
  emptyStateSub: {
    fontSize: 16,
    lineHeight: 24,
    maxWidth: '80%',
  },
});
