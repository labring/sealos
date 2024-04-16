import { inputAnatomy } from '@chakra-ui/anatomy';
import { createMultiStyleConfigHelpers } from '@chakra-ui/react';
import { colors } from '../colors';

const InputHelper = createMultiStyleConfigHelpers(inputAnatomy.keys);

export const Input = InputHelper.defineMultiStyleConfig({
  variants: {
    outline: {
      field: {
        width: '300px',
        fontSize: '12px',
        fontWeight: 400,
        height: '32px',
        borderRadius: 'md',
        border: '1px solid',
        borderColor: '#E8EBF0',
        bg: colors.grayModern[50],
        _focusVisible: {
          borderColor: colors.brightBlue[500],
          boxShadow: colors.boxShadowBlue,
          bg: '#FFF',
          color: '#111824'
        },
        _disabled: {
          color: '#8A95A7',
          bg: '#FBFBFC',
          _hover: {}
        },
        _hover: {
          borderColor: colors.brightBlue[300],
          bg: colors.grayModern[50]
        },
        _invalid: {
          bg: '#FFF',
          borderColor: '#D92D20',
          boxShadow: '0px 0px 0px 2.4px rgba(217, 45, 32, 0.15)'
        },
        _placeholder: {
          color: '#667085',
          fontSize: '12px',
          fontWeight: 400,
          lineHeight: '16px'
        }
      }
    }
  },
  defaultProps: {
    size: 'md',
    variant: 'outline'
  }
});
