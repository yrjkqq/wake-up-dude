import React, { useState, useCallback } from 'react';
import { View, FlatList, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { AlarmRecord, getAlarmHistory, deleteAlarmHistory } from '@/services/database';
import * as FileSystem from 'expo-file-system/legacy';
import { Audio } from 'expo-av';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';

export default function History() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const [history, setHistory] = useState<AlarmRecord[]>([]);
  const [playingId, setPlayingId] = useState<number | null>(null);
  const soundRef = React.useRef<Audio.Sound | null>(null);

  const loadData = () => {
    try {
      const data = getAlarmHistory();
      setHistory(data);
    } catch(e) { console.error('Error loading history DB', e); }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
      return () => {
        if (soundRef.current) {
          soundRef.current.unloadAsync();
          soundRef.current = null;
        }
      };
    }, [])
  );

  const handleDelete = async (item: AlarmRecord) => {
    try {
      deleteAlarmHistory(item.id);
      await FileSystem.deleteAsync(item.audioUri, { idempotent: true });
      loadData();
    } catch(e) {
      Alert.alert('删除失败', String(e));
    }
  };

  const playAudio = async (item: AlarmRecord) => {
    if (playingId === item.id && soundRef.current) {
      // Toggle stop
      await soundRef.current.stopAsync();
      await soundRef.current.unloadAsync();
      soundRef.current = null;
      setPlayingId(null);
      return;
    }

    try {
      // cleanup previous
      if (soundRef.current) {
        await soundRef.current.unloadAsync();
      }
      
      const { sound } = await Audio.Sound.createAsync({ uri: item.audioUri });
      soundRef.current = sound;
      setPlayingId(item.id);
      
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          setPlayingId(null);
        }
      });
      
      await sound.playAsync();
    } catch(e) {
      Alert.alert('播放失败', '录音缓存可能已被清理');
      setPlayingId(null);
    }
  };

  const renderItem = ({ item }: { item: AlarmRecord }) => (
    <View style={[styles.card, { backgroundColor: colors.surface }]}>
      <View style={styles.cardHeader}>
        <ThemedText style={{ fontSize: 13, color: colors.tint, fontWeight: '600' }}>
          {item.persona}
        </ThemedText>
        <ThemedText style={{ fontSize: 11, color: colors.textSecondary }}>
          {new Date(item.createdAt).toLocaleString()}
        </ThemedText>
      </View>
      <ThemedText style={styles.cardText} numberOfLines={4}>
        &quot;{item.text}&quot;
      </ThemedText>
      <View style={styles.cardActions}>
        <TouchableOpacity style={styles.actionBtn} onPress={() => playAudio(item)}>
          <Ionicons name={playingId === item.id ? 'stop-circle' : 'play-circle'} size={24} color={colors.tint} />
          <ThemedText style={{ marginLeft: 6, color: colors.tint }}>{playingId === item.id ? '停播' : '回听录音'}</ThemedText>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={() => handleDelete(item)}>
          <Ionicons name="trash-outline" size={22} color={colors.danger} />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ThemedText style={styles.title}>发疯语录历史</ThemedText>
      {history.length === 0 ? (
        <View style={styles.emptyWrap}>
          <ThemedText style={{ color: colors.textSecondary }}>暂无记录，快去设个闹钟吧！</ThemedText>
        </View>
      ) : (
        <FlatList
          data={history}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={{ padding: Spacing.md }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  title: { fontSize: 24, fontWeight: 'bold', marginHorizontal: Spacing.md, marginTop: Spacing.md },
  emptyWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  card: {
    borderRadius: 12,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  cardText: { fontSize: 15, lineHeight: 22, color: '#666' },
  cardActions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.05)' },
  actionBtn: { flexDirection: 'row', alignItems: 'center', padding: 4 }
});
