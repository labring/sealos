import { extendTheme } from '@chakra-ui/react';
import { colors } from './colors';
import { components } from './components';

const _theme = {
  colors,
  components,
  fonts: {
    body: '-apple-system, BlinkMacSystemFont, "PingFang SC", "Segoe UI", Helvetica, Arial, "PingFang SC", "Noto Sans SC", sans-serif',
    heading: 'Georgia, serif',
    mono: 'Menlo, monospace'
  },
  fontSizes: {
    sm: '10px',
    base: '12px',
    md: '14px',
    lg: '16px',
    xl: '18px'
  },
  breakpoints: {
    sm: '1024px',
    md: '1280px',
    lg: '1500px',
    xl: '1800px',
    '2xl': '2100px'
  },
  fontWeights: {
    bold: 500
  },
  radii: {
    xs: '1px',
    sm: '2px',
    base: '2px',
    md: '4px',
    lg: '6px',
    xl: '8px'
  },
  borders: {
    150: '1px solid #F0F1F6',
    200: '1px solid #E8EBF0'
  }
};

export type ThemeType = typeof _theme;

export const theme = extendTheme(_theme);
