import React from 'react';
import { View } from 'react-native';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function DatePicker({ date, onDateChange }: any) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  // The HTML time picker needs HH:mm format
  const timeString = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;

  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', height: 180, width: '100%' }}>
      {/* We use standard HTML input type="time" for web compatibility */}
      <input
        type="time"
        value={timeString}
        onChange={(e) => {
          const val = e.target.value;
          if (val) {
            const [h, m] = val.split(':');
            const newDate = new Date(date);
            newDate.setHours(parseInt(h, 10), parseInt(m, 10));
            onDateChange(newDate);
          }
        }}
        style={{
          fontSize: 32,
          padding: 12,
          borderRadius: 12,
          border: `1px solid ${colors.border}`,
          backgroundColor: 'transparent',
          color: colors.text,
          outline: 'none',
          fontFamily: 'monospace',
        }}
      />
    </View>
  );
}
