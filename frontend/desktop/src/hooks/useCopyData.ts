import { useToast } from '@chakra-ui/react';
import { useTranslation } from 'react-i18next';

/**
 * copy text data
 */
export const useCopyData = () => {
  const toast = useToast();
  const { t } = useTranslation();

  return {
    copyData: async (data: string, title: string = t('v2:copy_success')) => {
      let success = false;

      // Try modern Clipboard API first (works in most browsers with user gesture)
      if (navigator.clipboard && navigator.clipboard.writeText) {
        try {
          await navigator.clipboard.writeText(data);
          success = true;
        } catch (error) {
          // Clipboard API failed (likely due to permissions or Safari async context loss)
          // Fall through to legacy method
          console.warn('Clipboard API failed, using fallback method', error);
        }
      }

      // Fallback method: works reliably in Safari even after async operations
      if (!success) {
        try {
          const textarea = document.createElement('textarea');
          textarea.value = data;
          // Position off-screen to avoid visual flash
          textarea.style.position = 'fixed';
          textarea.style.top = '-9999px';
          textarea.style.left = '-9999px';
          textarea.setAttribute('readonly', '');
          document.body.appendChild(textarea);

          // For iOS Safari - use both methods to ensure compatibility
          const range = document.createRange();
          range.selectNodeContents(textarea);
          const selection = window.getSelection();
          if (selection) {
            selection.removeAllRanges();
            selection.addRange(range);
          }
          textarea.setSelectionRange(0, textarea.value.length);
          textarea.select();

          const successful = document.execCommand('copy');
          document.body.removeChild(textarea);

          if (!successful) {
            throw new Error('execCommand copy failed');
          }
          success = true;
        } catch (error) {
          console.error('Fallback copy method also failed', error);
          toast({
            position: 'top',
            title: t('v2:copy_failed') || 'Copy failed',
            status: 'error',
            duration: 2000
          });
          return;
        }
      }

      if (success) {
        toast({
          position: 'top',
          title,
          status: 'success',
          duration: 1000
        });
      }
    }
  };
};
