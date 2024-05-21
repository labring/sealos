import { defineStyleConfig } from '@chakra-ui/react';
import { colors as ThemeColors } from '../colors';

export const Button = defineStyleConfig({
  sizes: {
    xs: {},
    sm: {
      fontSize: '12px'
    },
    md: {
      fontSize: '14px'
    },
    lg: {}
  },
  variants: {
    primary: {
      bg: '#3E3B3B',
      _hover: {
        bg: '#3E3B3B',
        _disabled: {
          bg: '#3E3B3B'
        }
      },
      color: '#FEFEFE'
    },
    // >>>old
    secondary: {
      border: '1px solid',
      borderColor: 'grayModern.200',
      background: 'white_.500',
      color: 'grayModern.900',
      _hover: {
        borderColor: 'blue.600'
      }
    },
    warn: {
      bgColor: 'error.500',
      color: 'white_.100'
    },
    'white-bg-icon': {
      _hover: {
        bgColor: '#9699B41A'
      },
      minW: 'unset',
      h: 'unset',
      p: '4px'
    },
    // <<<
    solid: {
      bg: ThemeColors.grayModern[900],
      color: '#FFF',
      borderRadius: 'md',
      fontWeight: 500,
      boxShadow: ThemeColors.buttonBoxShadow,
      _hover: {
        opacity: '0.9',
        bg: ThemeColors.grayModern[900],
        _disabled: {
          bg: ThemeColors.grayModern[900],
          opacity: '0.4'
        }
      },
      _active: {
        bg: ''
      }
    },
    square: {
      borderRadius: '6px',
      minW: '30px',
      width: '30px',
      height: '30px',
      p: '0px',
      _hover: {
        color: 'brightBlue.600',
        bg: 'rgba(17, 24, 36, 0.05)'
      }
    },
    outline: {
      bg: '#FFF',
      borderRadius: 'md',
      fontWeight: 500,
      border: '1px solid',
      borderColor: 'grayModern.250',
      boxShadow: ThemeColors.buttonBoxShadow,
      color: 'grayModern.600',
      minW: '16px',
      minH: '16px',
      _hover: {
        opacity: '0.9',
        bg: 'rgba(33, 155, 244, 0.05)',
        color: 'brightBlue.700',
        borderColor: 'brightBlue.300'
      },
      _active: {
        bg: ''
      }
    }
  },
  defaultProps: {
    variant: 'solid',
    size: 'md'
  }
});
