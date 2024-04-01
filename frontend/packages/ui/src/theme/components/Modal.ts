import { modalAnatomy } from '@chakra-ui/anatomy';
import { createMultiStyleConfigHelpers } from '@chakra-ui/react';

const ModalHelper = createMultiStyleConfigHelpers(modalAnatomy.keys);

export const Modal = ModalHelper.defineMultiStyleConfig({
  baseStyle: {
    header: {
      bg: '#FBFBFC',
      borderTopRadius: '10px',
      borderBottom: '1px solid #F4F4F7',
      fontSize: '16px',
      color: 'grayModern.900',
      fontWeight: '500',
      py: '11.5px',
      lineHeight: '24px'
    },
    closeButton: {
      fill: '#111824',
      svg: {
        width: '12px',
        height: '12px'
      }
    },
    dialog: {
      borderRadius: '10px'
    },
    body: {
      px: '36px',
      py: '24px'
    },
    footer: {
      px: '36px',
      pb: '24px',
      pt: '0px'
    }
  }
});
