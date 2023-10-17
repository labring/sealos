import { inputAnatomy } from '@chakra-ui/anatomy';
import { createMultiStyleConfigHelpers } from '@chakra-ui/react';

const { definePartsStyle, defineMultiStyleConfig } = createMultiStyleConfigHelpers(
  inputAnatomy.keys
);

const secondary = definePartsStyle({
  // define the part you're going to style
  addon: {
    bgColor: 'grayModern.100'
  },
  field: {
    border: '1px solid',
    borderColor: 'grayModern.200',
    background: 'white_.500',
    color: 'grayModern.900',
    borderRadius: '4px'
  }
});
export const Input = defineMultiStyleConfig({ variants: { secondary } });
