import { defineStyle, defineStyleConfig, extendTheme } from '@chakra-ui/react';
import { theme as originTheme } from '@sealos/ui';
originTheme.font;
export const theme = extendTheme(originTheme, {
  components: {
    Modal: {
      baseStyle: {
        header: {
          px: '20px',
          py: '11px'
        },
        dialogContainer: {
          color: 'grayModern.900'
        }
      }
    },
    Button: defineStyleConfig({
      variants: {
        warningConfirm: defineStyle({
          px: '19.5px',
          py: '8px',
          fontSize: '12px',
          fontWeight: '500',
          color: '#FFF',
          borderRadius: '6px',
          height: 'auto',
          bgColor: 'red.600',
          boxShadow: '0px 0px 1px 0px #13336B14, 0px 1px 2px 0px #13336B0D',
          _hover: {
            bgColor: 'rgba(217, 45, 32, 0.9)'
          }
        })
      }
    })
  }
});
