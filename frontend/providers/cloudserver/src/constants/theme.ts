import { extendTheme } from '@chakra-ui/react';
import { theme as sealosTheme } from '@sealos/ui';

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
  }
});
