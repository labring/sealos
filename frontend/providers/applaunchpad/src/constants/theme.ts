import { extendTheme } from '@chakra-ui/react';
import { theme as sealosTheme } from '@sealos/ui';

import { switchAnatomy } from '@chakra-ui/anatomy';
import { createMultiStyleConfigHelpers } from '@chakra-ui/react';

const { definePartsStyle, defineMultiStyleConfig } = createMultiStyleConfigHelpers(
  switchAnatomy.keys
);

const baseStyle = definePartsStyle({
  container: {},
  track: {
    bg: 'gray.200'
  }
});

export const Switch = defineMultiStyleConfig({ baseStyle });

export const theme = extendTheme(sealosTheme, {
  styles: {
    global: {
      'html, body': {
        fontSize: 'md',
        height: '100%',
        overflow: 'overlay',
        fontWeight: 400,
        minWidth: '1024px'
      }
    }
  },
  components: {
    Switch: Switch
  }
});
