import { defineStyleConfig } from '@chakra-ui/react';
import { colors as ThemeColors } from '../colors';

export const Button = defineStyleConfig({
  sizes: {
    primary: {
      width: '215px'
    },
    sm: {
      width: '75px',
      height: '32px'
    },
    md: {
      width: '100px',
      height: '36px'
    },
    lg: {
      width: '180px',
      height: '36px'
    }
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
      fontSize: '14px',
      fontWeight: 500,
      _hover: {
        opacity: '0.9',
        bg: ThemeColors.grayModern[900]
      },
      _active: {
        bg: ''
      }
    },

    outline: {
      bg: '#FFF',
      borderRadius: 'md',
      fontSize: '14px',
      fontWeight: 500,
      border: '1px solid #DFE2EA',
      color: 'grayModern.600',
      _hover: {
        bg: '#FFF',
        opacity: '0.9'
      },
      _active: {
        bg: ''
      }
    }
  },
  defaultProps: {
    size: 'md',
    variant: 'solid'
  }
});
