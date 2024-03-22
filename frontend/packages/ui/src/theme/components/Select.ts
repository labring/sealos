import { selectAnatomy } from '@chakra-ui/anatomy';
import { createMultiStyleConfigHelpers } from '@chakra-ui/react';

const { definePartsStyle, defineMultiStyleConfig } = createMultiStyleConfigHelpers(
  selectAnatomy.keys
);

export const Select = defineMultiStyleConfig({
  variants: {
    secondary: definePartsStyle({
      field: {
        borderRadius: '4px',
        border: '1px solid',
        borderColor: 'grayModern.200',
        background: 'white_.500',
        color: 'grayModern.900'
      }
    })
  }
});
