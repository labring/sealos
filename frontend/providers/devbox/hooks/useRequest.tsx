import { useMessage } from '@sealos/ui';
import type { UseMutationOptions } from '@tanstack/react-query';
import { useMutation } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';

import { getErrText } from '@/utils/tools';

interface Props extends UseMutationOptions<any, any, any, any> {
  successToast?: string | null;
  errorToast?: string | null;
}

export const useRequest = ({ successToast, errorToast, onSuccess, onError, ...props }: Props) => {
  const { message: toast } = useMessage();
  const t = useTranslations();
  const mutation = useMutation({
    ...props,
    onSuccess(res, variables: void, context: unknown) {
      onSuccess?.(res, variables, context);
      successToast &&
        toast({
          title: successToast,
          status: 'success'
        });
    },
    onError(err: any, variables: void, context: unknown) {
      onError?.(err, variables, context);
      errorToast &&
        toast({
          title: t(getErrText(err, errorToast)),
          status: 'error'
        });
    }
  });

  return mutation;
};
