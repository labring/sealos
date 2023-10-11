import { defineStyleConfig } from '@chakra-ui/react';

export const Button = defineStyleConfig({
  baseStyle: {
    borderRadius: '4px'
  },
  variants: {
    primary: {
      background: 'grayModern.900',
      color: 'white'
    },
    secondary: {
      border: '1px solid',
      borderColor: 'grayModern.200',
      background: 'white_.400'
    },
    warn: {
      bgColor: 'error.500',
      color: 'white_.100'
    }
  }
});
