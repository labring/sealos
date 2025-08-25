import { useToast } from '@chakra-ui/react';

/**
 * copy text data
 */
export const useCopyData = () => {
  const toast = useToast();
  return {
    copyData: async (data: string, title: string = '复制成功') => {
      try {
        if (navigator.clipboard) {
          await navigator.clipboard.writeText(data);
        } else {
          throw new Error('');
        }
      } catch (error) {
        const textarea = document.createElement('textarea');
        textarea.value = data;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      toast({
        position: 'top',
        title,
        status: 'success',
        duration: 1000
      });
    }
  };
};
