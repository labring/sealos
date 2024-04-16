import { numberInputAnatomy } from '@chakra-ui/anatomy';
import { createMultiStyleConfigHelpers } from '@chakra-ui/react';
import { colors } from '../colors';

const NumberInputHelper = createMultiStyleConfigHelpers(numberInputAnatomy.keys);

export const NumberInput = NumberInputHelper.defineMultiStyleConfig({
  baseStyle: {
    root: {
      borderRadius: 'lg',
      borderColor: '#E8EBF0',
      bg: colors.grayModern[50],
      _hover: {
        borderColor: colors.brightBlue[300],
        bg: colors.grayModern[50]
      }
    },
    field: {
      // _focusVisible _hover bordercolor doesn't work
      borderRadius: 'lg',
      bg: colors.grayModern[50]
    },
    stepperGroup: {
      borderColor: '#E8EBF0'
    },
    stepper: {
      borderColor: '#E8EBF0'
    }
  }
});
