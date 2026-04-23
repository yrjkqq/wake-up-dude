import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Modal,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemedText } from './themed-text';
import { Colors, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import DatePicker from './time-picker';
import { Alarm, AlarmType } from '@/services/database';

interface AlarmEditModalProps {
  visible: boolean;
  alarm?: Alarm; // If provided, we are editing
  onClose: () => void;
  onSave: (time: string, persona: string, alarmType: AlarmType) => void;
}

const PERSONAS = [
  '温柔女友',
  '毒舌监督员',
  '军训教官',
  '傲娇猫咪',
];

export function AlarmEditModal({ visible, alarm, onClose, onSave }: AlarmEditModalProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const [date, setDate] = useState(new Date());
  const [persona, setPersona] = useState(PERSONAS[0]);
  const [alarmType, setAlarmType] = useState<AlarmType>('voice');

  useEffect(() => {
    async function init() {
      if (alarm) {
        const [hours, minutes] = alarm.time.split(':').map(Number);
        const d = new Date();
        d.setHours(hours, minutes, 0, 0);
        setDate(d);
        setPersona(alarm.persona.replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]\s*/g, '')); // Strip emoji if old data
        setAlarmType(alarm.alarmType || 'voice');
      } else {
        const d = new Date();
        d.setMinutes(d.getMinutes() + 1);
        d.setSeconds(0, 0);
        setDate(d);
        
        // Fetch defaults from settings
        const defaultP = await AsyncStorage.getItem('SETTINGS_PERSONA');
        setPersona(defaultP ? defaultP.replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]\s*/g, '') : PERSONAS[0]);
        
        const defaultType = await AsyncStorage.getItem('SETTINGS_ALARM_TYPE') as AlarmType;
        setAlarmType(defaultType || 'voice');
      }
    }
    if (visible) init();
  }, [alarm, visible]);

  const handleSave = () => {
    const timeStr = date.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    onSave(timeStr, persona, alarmType);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true}>
      <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
        <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose}>
              <ThemedText style={{ color: colors.textSecondary }}>取消</ThemedText>
            </TouchableOpacity>
            <ThemedText style={styles.title}>{alarm ? '编辑闹钟' : '新建闹钟'}</ThemedText>
            <TouchableOpacity onPress={handleSave}>
              <ThemedText style={{ color: colors.tint, fontWeight: 'bold' }}>完成</ThemedText>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.scrollBody}>
            <View style={styles.pickerContainer}>
              <DatePicker
                date={date}
                mode="time"
                onDateChange={setDate}
                // @ts-ignore
                textColor={colors.text}
                // @ts-ignore
                fadeToColor="none"
              />
            </View>

            <View style={styles.section}>
              <ThemedText style={styles.sectionTitle}>闹钟类型</ThemedText>
              <View style={styles.personaGrid}>
                {[
                  { label: '语音', value: 'voice' },
                  { label: '音乐', value: 'music' },
                ].map((t) => (
                  <TouchableOpacity
                    key={t.value}
                    style={[
                      styles.personaChip,
                      {
                        backgroundColor: alarmType === t.value ? colors.tint + '20' : colors.background,
                        borderColor: alarmType === t.value ? colors.tint : colors.border,
                      },
                    ]}
                    onPress={() => setAlarmType(t.value as AlarmType)}
                  >
                    <ThemedText
                      style={{
                        color: alarmType === t.value ? colors.tint : colors.text,
                        fontSize: 14,
                      }}
                    >
                      {t.label}
                    </ThemedText>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.section}>
              <ThemedText style={styles.sectionTitle}>默认人设</ThemedText>
              <View style={styles.personaGrid}>
                {PERSONAS.map((p) => (
                  <TouchableOpacity
                    key={p}
                    style={[
                      styles.personaChip,
                      {
                        backgroundColor: persona === p ? colors.tint + '20' : colors.background,
                        borderColor: persona === p ? colors.tint : colors.border,
                      },
                    ]}
                    onPress={() => setPersona(p)}
                  >
                    <ThemedText
                      style={{
                        color: persona === p ? colors.tint : colors.text,
                        fontSize: 14,
                      }}
                    >
                      {p}
                    </ThemedText>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '80%',
    paddingTop: Spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#ccc',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  scrollBody: {
    paddingBottom: Spacing.xxl,
  },
  pickerContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
  section: {
    paddingHorizontal: Spacing.lg,
    marginTop: Spacing.md,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: Spacing.md,
  },
  personaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  personaChip: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: 20,
    borderWidth: 1,
  },
});
