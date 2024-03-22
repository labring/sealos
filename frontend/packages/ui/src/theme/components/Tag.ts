import { tagAnatomy } from '@chakra-ui/anatomy';
import { createMultiStyleConfigHelpers } from '@chakra-ui/react';

const TagHelper = createMultiStyleConfigHelpers(tagAnatomy.keys);

export const Tag = TagHelper.defineMultiStyleConfig({
  baseStyle: {
    container: {
      borderRadius: '8px',
      backgroundColor: 'gray.150'
    },
    label: {
      fontWeight: 500,
      fontSize: '12px'
    }
  }
});
