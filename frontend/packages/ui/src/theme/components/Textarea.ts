import { ComponentStyleConfig } from '@chakra-ui/react';

export const Textarea: ComponentStyleConfig = {
  variants: {
    outline: {
      border: '1px solid',
      borderRadius: 'base',
      borderColor: 'myGray.200',
      _focus: {
        borderColor: 'myBlue.600',
        boxShadow: '0px 0px 4px #A8DBFF'
      }
    }
  },

  defaultProps: {
    size: 'md',
    variant: 'outline'
  }
};
