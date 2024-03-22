import { ComponentStyleConfig } from '@chakra-ui/react';
import { colors } from '../colors';

export const Textarea: ComponentStyleConfig = {
  variants: {
    outline: {
      border: '1px solid',
      bg: 'grayModern.50',
      borderRadius: 'md',
      borderColor: '#E8EBF0',
      _focusVisible: {
        borderColor: colors.brightBlue[500],
        boxShadow: colors.boxShadowBlue
      }
    }
  },
  defaultProps: {
    size: 'md',
    variant: 'outline'
  }
};
