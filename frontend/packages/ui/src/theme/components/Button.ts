import { border, defineStyle, defineStyleConfig } from '@chakra-ui/react';

export const Button = defineStyleConfig({
  baseStyle: {
    borderRadius: '4px'
  },
  variants: {
    primary: {
      background: 'grayModern.900',
      color: 'white',
      fontSize: '14px'
    },
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
    }
  }
});
