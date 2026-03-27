import React, { useRef } from 'react';
import { View, Animated, PanResponder, StyleSheet } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';

interface Props {
  onStop: () => void;
}

export default function SwipeToStop({ onStop }: Props) {
  const pan = useRef(new Animated.ValueXY()).current;
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  
  const SWIPE_WIDTH = 260;
  const KNOB_SIZE = 60;
  const MAX_SWIPE = SWIPE_WIDTH - KNOB_SIZE;

  const onStopRef = useRef(onStop);
  onStopRef.current = onStop;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dx >= 0 && gestureState.dx <= MAX_SWIPE) {
          pan.setValue({ x: gestureState.dx, y: 0 });
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx >= MAX_SWIPE * 0.8) {
          // Success
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          Animated.spring(pan, {
            toValue: { x: MAX_SWIPE, y: 0 },
            useNativeDriver: false,
          }).start(() => {
             onStopRef.current();
             // Reset back slowly after stopped
             setTimeout(() => {
                pan.setValue({ x: 0, y: 0 });
             }, 300);
          });
        } else {
          // Revert back
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          Animated.spring(pan, {
            toValue: { x: 0, y: 0 },
            useNativeDriver: false,
            friction: 5,
          }).start();
        }
      },
    })
  ).current;

  return (
    <View style={[styles.track, { backgroundColor: colors.border }]}>
      <ThemedText style={[styles.trackText, { color: colors.textSecondary }]}>
        &gt;&gt; 右滑彻底叫醒自己 &gt;&gt;
      </ThemedText>
      <Animated.View
        style={[
          styles.knob,
          { backgroundColor: colors.tint },
          { transform: [{ translateX: pan.x }] },
        ]}
        {...panResponder.panHandlers}
      >
        <Ionicons name="alarm-outline" size={28} color="#fff" />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    width: 260,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
    alignSelf: 'center',
  },
  trackText: {
    position: 'absolute',
    width: '100%',
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '600',
    opacity: 0.6,
  },
  knob: {
    width: 60,
    height: 60,
    borderRadius: 30,
    position: 'absolute',
    left: 0,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
});
