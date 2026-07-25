import { NextApiResponse } from 'next';
import { ApiResponse, ResponseCode, ResponseMessages } from '@/types/response';
import { V1Status } from '@kubernetes/client-node';
import {
  getPublicDomainConflictResponse,
  isIngressPublicDomainConflictError,
  PublicDomainError
} from './publicDomain';

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

export function getPublicDomainErrorResponse(err: PublicDomainError) {
  return {
    code: err.code,
    message: err.message,
    ...(err.conflictOwner ? { conflictOwner: err.conflictOwner } : {})
  };
}

const getErrorBody = (err: any) => err?.body || err?.response?.body || err;

const getErrorStatusCode = (err: any) => {
  const body = getErrorBody(err);
  const code = body?.code ?? err?.response?.statusCode ?? err?.response?.status ?? err?.statusCode;
  return typeof code === 'number' ? code : undefined;
};

const getErrorMessage = (err: any) => {
  const body = getErrorBody(err);
  if (typeof err === 'string') return err;
  if (typeof body === 'string') return body;
  return body?.message || err?.message || body?.reason || err?.reason || '';
};

export const handleK8sError = (
  err: any,
  options: {
    forbiddenCode?: ResponseCode.FORBIDDEN | ResponseCode.FORBIDDEN_CREATE_APP;
  } = {}
): Partial<ApiResponse> => {
  if (isIngressPublicDomainConflictError(err)) {
    const conflict = getPublicDomainConflictResponse(err);
    return {
      code: 409,
      message: conflict.message,
      error: conflict
    };
  }

  const body = getErrorBody(err);
  const statusCode = getErrorStatusCode(err);
  const errMessage = getErrorMessage(err);
  const forbiddenCode = options.forbiddenCode ?? ResponseCode.FORBIDDEN_CREATE_APP;

  if (
    body?.kind === 'Status' ||
    body?.apiVersion === 'v1' ||
    body?.status ||
    typeof statusCode === 'number'
  ) {
    const k8sApiErr = body as V1Status;
    if ((k8sApiErr.code ?? statusCode) === 403) {
      if (errMessage.includes('account balance less than 0')) {
        return {
          code: ResponseCode.BALANCE_NOT_ENOUGH,
          message: ResponseMessages[ResponseCode.BALANCE_NOT_ENOUGH]
        };
      }
      if (errMessage.includes('exceeded quota')) {
        return {
          code: ResponseCode.QUOTA_EXCEEDED,
          message: ResponseMessages[ResponseCode.QUOTA_EXCEEDED]
        };
      }
      return {
        code: forbiddenCode,
        message: ResponseMessages[forbiddenCode]
      };
    }
    if ((k8sApiErr.code ?? statusCode) === 409 && errMessage.includes('already exists')) {
      return {
        code: ResponseCode.APP_ALREADY_EXISTS,
        message: ResponseMessages[ResponseCode.APP_ALREADY_EXISTS]
      };
    }
  }

  if (/forbidden|permission denied/i.test(errMessage)) {
    return {
      code: forbiddenCode,
      message: ResponseMessages[forbiddenCode]
    };
  }

  return {
    code: typeof body?.code === 'number' ? body.code : ResponseCode.SERVER_ERROR,
    message: errMessage || ResponseMessages[ResponseCode.SERVER_ERROR]
  };
};
