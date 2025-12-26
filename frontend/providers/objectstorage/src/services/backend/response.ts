import { NextApiResponse } from 'next';
import { ERROR_TEXT, ERROR_RESPONSE } from '../error';
import { ResponseCode, ResponseMessages } from '@/types/response';
import { V1Status } from '@kubernetes/client-node';

export type ApiResp<T = unknown> = {
  code: number;
  message: string;
  data?: T;
};

/**
 * Handle Kubernetes API errors and convert them to standard API responses
 * Priority: err.body > err
 *
 * @param err - Error object from K8s API
 * @returns Partial ApiResp object to be passed to jsonRes
 */
export const handleK8sError = (err: any): Partial<ApiResp> => {
  const errorData = err?.body || err;

  if (errorData?.kind === 'Status' && errorData?.apiVersion === 'v1' && errorData?.status) {
    const k8sApiErr = errorData as V1Status;

    if (k8sApiErr.code === 403) {
      if (k8sApiErr.message?.includes('account balance less than 0')) {
        return {
          code: ResponseCode.BALANCE_NOT_ENOUGH,
          message: ResponseMessages[ResponseCode.BALANCE_NOT_ENOUGH]
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
    code: errorData?.code || err?.code || ResponseCode.INTERNAL_SERVER_ERROR,
    message:
      errorData?.message || err?.message || ResponseMessages[ResponseCode.INTERNAL_SERVER_ERROR]
  };
};

export const jsonRes = <T = unknown>(
  res: NextApiResponse,
  props?: {
    code?: number;
    message?: string;
    data?: T;
    error?: any;
  }
) => {
  const { code = 200, message = '', data = null, error } = props || {};

  // Specified error
  if (typeof error === 'string' && ERROR_RESPONSE[error]) {
    return res.json(ERROR_RESPONSE[error]);
  }

  // another error
  let msg = message;
  if ((code < 200 || code >= 400) && !message) {
    msg = error?.body?.message || error?.message || '请求错误';
    if (typeof error === 'string') {
      msg = error;
    } else if (error?.code && error.code in ERROR_TEXT) {
      msg = ERROR_TEXT[error.code];
    }
    console.log('error:', error);
    console.log('error message:', msg);
  }

  res.json({
    code,
    statusText: '',
    message: msg,
    data: data || error || null
  });
};
