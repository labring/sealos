import { useToast as uToast, UseToastOptions } from '@chakra-ui/react';

export const useToast = (props?: UseToastOptions) => {
  const toast = uToast({
    position: 'top',
    ...props
  });

  return {
    toast
  };
};
