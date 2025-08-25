import { NextApiResponse } from 'next';
import { ApiResponse, ResponseCode, ResponseMessages } from '@/types/response';
import { V1Status } from '@kubernetes/client-node';

export const jsonRes = <T = any>(res: NextApiResponse, options: Partial<ApiResponse<T>> = {}) => {
  const { code = ResponseCode.SUCCESS, message, data, error } = options;
  const response: ApiResponse<T> = {
    code,
    message: message || ResponseMessages[code] || 'Unknown error',
    data,
    error
  };
  if (error) {
    console.error('===jsonRes===\n', error?.body || error);
  }
  return res.json(response);
};

export const handleK8sError = (err: any): Partial<ApiResponse> => {
  if (!!err?.body) {
    err = err.body;
  }
  if (err?.kind === 'Status' && err?.apiVersion === 'v1' && err?.status) {
    const k8sApiErr = err as V1Status;
    if (k8sApiErr.code === 403) {
      if (k8sApiErr.message?.includes('account balance less than 0')) {
        return {
          code: ResponseCode.BALANCE_NOT_ENOUGH,
          message: ResponseMessages[ResponseCode.BALANCE_NOT_ENOUGH]
        };
      }
      if (k8sApiErr?.reason === 'Forbidden') {
        return {
          code: ResponseCode.FORBIDDEN,
          message: k8sApiErr.message
        };
      }
      return {
        code: ResponseCode.FORBIDDEN_CREATE_APP,
        message: ResponseMessages[ResponseCode.FORBIDDEN_CREATE_APP]
      };
    }
    if (k8sApiErr.code === 409 && k8sApiErr.message?.includes('already exists')) {
      return {
        code: ResponseCode.APP_ALREADY_EXISTS,
        message: ResponseMessages[ResponseCode.APP_ALREADY_EXISTS]
      };
    }
  }

  return {
    code: err?.code || ResponseCode.SERVER_ERROR,
    message: err?.message || ResponseMessages[ResponseCode.SERVER_ERROR]
  };
};
