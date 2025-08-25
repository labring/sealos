import { switchAnatomy } from '@chakra-ui/anatomy';
import { createMultiStyleConfigHelpers } from '@chakra-ui/react';

const SwitchHelper = createMultiStyleConfigHelpers(switchAnatomy.keys);

export const Switch = SwitchHelper.defineMultiStyleConfig({
  baseStyle: {
    track: {
      bg: 'gray.100',
      _checked: {
        bg: 'gray.700'
      }
    }
  }
});
