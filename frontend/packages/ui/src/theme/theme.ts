import { extendTheme } from '@chakra-ui/react';
import { colors } from './colors';
import { components } from './components';

const _theme = {
  colors,
  components,
  fonts: {
    body: '-apple-system, BlinkMacSystemFont, "PingFang SC", "Segoe UI", Helvetica, Arial, "PingFang SC", "Noto Sans SC", sans-serif',
    heading:
      '-apple-system, BlinkMacSystemFont, "PingFang SC", "Segoe UI", Helvetica, Arial, "PingFang SC", "Noto Sans SC", sans-serif',
    mono: 'Menlo, monospace'
  },
  fontSizes: {
    sm: '10px',
    base: '12px',
    md: '14px',
    lg: '16px',
    xl: '18px',
    '2xl': '20px'
  },
  breakpoints: {
    base: '0px',
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    '2xl': '1536px'
  },
  fontWeights: {
    bold: 500
  },
  radii: {
    xs: '1px',
    sm: '2px',
    base: '4px',
    md: '6px',
    lg: '8px',
    xl: '12px',
    '2xl': '16px'
  },
  borders: {
    150: '1px solid #F0F1F6',
    200: '1px solid #E8EBF0',
    base: '1px solid #E8EBF0'
  }
};

export type ThemeType = typeof _theme;

export const theme = extendTheme(_theme);
