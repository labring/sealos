// new !!!
const baseColors = {
  yellow: {
    25: '#FFFDFA',
    50: '#FFFAEB',
    100: '#FEF0C7',
    200: '#FEDF89',
    300: '#FEC84B',
    400: '#FDB022',
    500: '#F79009',
    600: '#DC6803',
    700: '#B54708',
    800: '#93370D',
    900: '#7A2E0E'
  },
  sealosGrayModern: {
    '05': 'rgba(17, 24, 36, 0.05)',
    1: 'rgba(17, 24, 36, 0.1)',
    15: 'rgba(17, 24, 36, 0.15)',
    25: '#FBFBFC',
    50: '#F7F8FA',
    100: '#F4F4F7',
    150: '#F0F1F6',
    200: '#E8EBF0',
    250: '#DFE2EA',
    300: '#C4CBD7',
    400: '#8A95A7',
    500: '#667085',
    600: '#485264',
    700: '#383F50',
    800: '#1D2532',
    900: '#111824'
  },
  sealosRed: {
    50: '#FEF3F2',
    600: '#D92D20'
  }
};

const otherColors = {
  surfaceLow: baseColors.sealosGrayModern[50],
  surface: baseColors.sealosGrayModern[100]
};

export const colors = {
  primary: {
    100: '#E6F6F6',
    200: '#CCEEED',
    300: '#99DDDB',
    400: '#66CBCA',
    500: '#33BABB',
    600: '#00A9A6',
    700: '#008F8D',
    800: '#006B6A',
    900: '#004846',
    1000: '#002423'
  },
  // 避免和 white 冲突， black也是同理
  white_: {
    100: '#FEFEFE',
    200: '#FDFDFE',
    300: '#FBFBFC',
    400: '#F8FAFB',
    500: '#F6F8F9',
    600: '#F4F6F8',
    700: '#C3C5C6',
    800: '#929495',
    900: '#626263',
    1000: '#313132'
  },
  grayModern: {
    100: '#EFF0F1',
    200: '#DEE0E2',
    300: '#BDC1C5',
    400: '#9CA2A8',
    500: '#7B838B',
    600: '#5A646E',
    700: '#485058',
    800: '#363C42',
    900: '#24282C',
    1000: '#121416'
  },
  grayIron: {
    100: '#F3F3F3',
    200: '#E6E6E7',
    300: '#CDCDD0',
    400: '#B4B4B8',
    500: '#9B9BA1',
    600: '#828289',
    700: '#68686E',
    800: '#4E4E52',
    900: '#343437',
    1000: '#1A1A1B'
  },
  error: {
    100: '#FFEBED',
    200: '#FFD6DB',
    300: '#FFADB7',
    400: '#FF8492',
    500: '#FF5B6E',
    600: '#FF324A'
  },
  warn: {
    100: '#FFF2EC',
    400: '#FDB08A',
    600: '#FB7C3C',
    700: '#C96330'
  },
  rose: {
    100: '#FDEAF1'
  },
  blue: {
    100: '#EBF7FD',
    400: '#86CEF5',
    500: '#5EBDF2',
    600: '#36ADEF',
    700: '#2B8ABF'
  },
  brightBlue: {
    600: '#219BF4',
    700: '#0884DD'
  },
  adora: {
    600: '#8172D8'
  },
  purple: {
    300: '#DBBDE9',
    400: '#C99CDF',
    500: '#B779D4',
    600: '#A55AC9',
    700: '#7167AA'
  },
  frostyNightfall: {
    100: '#F5F5F8',
    200: '#EAEBF0'
  },
  ...baseColors,
  ...otherColors
};
