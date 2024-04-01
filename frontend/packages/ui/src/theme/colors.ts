const baseColors = {
  grayModern: {
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
  blue: {
    25: '#F9FAFE',
    50: '#F0F4FF',
    100: '#E1EAFF',
    200: '#C5D7FF',
    300: '#94B5FF',
    400: '#5E8FFF',
    500: '#487FFF',
    600: '#3370FF',
    700: '#2B5FD9',
    800: '#2450B5',
    900: '#1D4091'
  },
  green: {
    25: '#F9FEFB',
    50: '#EDFBF3',
    100: '#D1FADF',
    200: '#B9F4D1',
    300: '#76E4AA',
    400: '#32D583',
    500: '#12B76A',
    600: '#039855',
    700: '#027A48',
    800: '#05603A',
    900: '#054F31'
  },
  red: {
    1: 'rgba(217,45,32,0.1)',
    3: 'rgba(217,45,32,0.3)',
    5: 'rgba(217,45,32,0.5)',
    25: '#FFFBFA',
    50: '#FEF3F2',
    100: '#FEE4E2',
    200: '#FECDCA',
    300: '#FDA29B',
    400: '#F97066',
    500: '#F04438',
    600: '#D92D20',
    700: '#B42318',
    800: '#912018',
    900: '#7A271A'
  },
  brightBlue: {
    25: '#F9FDFE',
    50: '#F0FBFF',
    100: '#DBF3FF',
    200: '#BCE7FF',
    300: '#85CCFF',
    400: '#47B2FF',
    500: '#219BF4',
    600: '#0884DD',
    700: '#0770BC',
    800: '#005B9C',
    900: '#004B82'
  },
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
  adora: {
    25: '#FCFCFF',
    50: '#F0EEFF',
    100: '#E4E1FC',
    200: '#D3CAFF',
    300: '#B6A8FC',
    400: '#9E8DFB',
    500: '#8774EE',
    600: '#6F5DD7',
    700: '#5E4EBD',
    800: '#4E4198',
    900: '#42387D'
  }
};

const otherColors = {
  surfaceLow: baseColors.grayModern[50],
  surface: baseColors.grayModern[100],
  boxShadowBlue: '0px 0px 0px 2.4px rgba(33, 155, 244, 0.15)',
  buttonBoxShadow:
    '0px 1px 2px 0px rgba(19, 51, 107, 0.05), 0px 0px 1px 0px rgba(19, 51, 107, 0.08)'
};

export const colors = {
  ...baseColors,
  ...otherColors
};
