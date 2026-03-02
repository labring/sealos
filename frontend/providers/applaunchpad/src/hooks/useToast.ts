import { toast as sonnerToast } from 'sonner';

type ToastStatus = 'success' | 'error' | 'warning' | 'info';

interface ToastOptions {
  title?: string;
  description?: string;
  status?: ToastStatus;
  duration?: number;
}

export const useToast = () => {
  const toast = (options: ToastOptions) => {
    const { title, description, status = 'info', duration = 2000 } = options;
    const message = title || description || '';

    switch (status) {
      case 'success':
        sonnerToast.success(message, { duration });
        break;
      case 'error':
        sonnerToast.error(message, { duration });
        break;
      case 'warning':
        sonnerToast.warning(message, { duration });
        break;
      case 'info':
      default:
        sonnerToast.info(message, { duration });
        break;
    }
  };

  return {
    toast
  };
};
