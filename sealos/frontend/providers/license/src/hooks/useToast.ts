import { useToast as uToast, UseToastOptions } from '@chakra-ui/react';

export const useToast = (props?: UseToastOptions) => {
  const toast = uToast({
    position: 'top',
    duration: 3000,
    ...props
  });

  return {
    toast
  };
};
