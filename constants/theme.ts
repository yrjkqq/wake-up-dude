/**
 * Wake up dude — Theme constants
 * Colors, fonts, and spacing for the alarm clock app.
 */

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#1A1A2E',
    textSecondary: '#6B7280',
    background: '#FAFAFA',
    surface: '#FFFFFF',
    tint: '#E85D04',
    accent: '#F48C06',
    danger: '#DC2626',
    success: '#16A34A',
    icon: '#6B7280',
    tabIconDefault: '#6B7280',
    tabIconSelected: '#E85D04',
    border: '#E5E7EB',
    cardBackground: '#FFFFFF',
  },
  dark: {
    text: '#F1F5F9',
    textSecondary: '#94A3B8',
    background: '#0F172A',
    surface: '#1E293B',
    tint: '#FB923C',
    accent: '#F59E0B',
    danger: '#EF4444',
    success: '#22C55E',
    icon: '#94A3B8',
    tabIconDefault: '#94A3B8',
    tabIconSelected: '#FB923C',
    border: '#334155',
    cardBackground: '#1E293B',
  },
};

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};
