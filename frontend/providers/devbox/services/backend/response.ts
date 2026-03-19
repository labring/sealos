import { NextResponse } from 'next/server';

import { V1Status } from '@kubernetes/client-node';
import { ERROR_ENUM, ERROR_RESPONSE, ERROR_TEXT } from '../error';

const getQuotaExceededMessageKey = (message = '') => {
  const normalizedMessage = message.toLowerCase();

  if (!normalizedMessage.includes('exceeded quota')) {
    return '';
  }

  if (
    normalizedMessage.includes('requests.storage') ||
    normalizedMessage.includes('persistentvolumeclaims') ||
    normalizedMessage.includes('requests.ephemeral-storage') ||
    normalizedMessage.includes('limits.ephemeral-storage')
  ) {
    return 'storage_exceeds_quota';
  }

  if (normalizedMessage.includes('limits.cpu') || normalizedMessage.includes('requests.cpu')) {
    return 'cpu_exceeds_quota';
  }

  if (normalizedMessage.includes('limits.memory') || normalizedMessage.includes('requests.memory')) {
    return 'memory_exceeds_quota';
  }

  if (normalizedMessage.includes('services.nodeports') || normalizedMessage.includes('count/devboxes')) {
    return 'nodeports_exceeds_quota';
  }

  return '';
};

const isKubernetesStatusBody = (body: any) =>
  body instanceof V1Status ||
  (!!body &&
    typeof body === 'object' &&
    (typeof body.code === 'number' ||
      typeof body.code === 'string' ||
      typeof body.reason === 'string' ||
      typeof body.message === 'string'));

export const jsonRes = <T = any>(props: {
  code?: number;
  message?: string;
  data?: T;
  error?: any;
}) => {
  const { code = 200, message = '', data = null, error } = props || {};

  if (typeof error === 'string' && ERROR_RESPONSE[error]) {
    return NextResponse.json(ERROR_RESPONSE[error]);
  }
  const body = error?.body;
  if (isKubernetesStatusBody(body)) {
    const bodyMessage = typeof body.message === 'string' ? body.message : '';
    const quotaExceededMessageKey = getQuotaExceededMessageKey(bodyMessage);

    if (bodyMessage.includes('40001:')) {
      return NextResponse.json(ERROR_RESPONSE[ERROR_ENUM.outstandingPayment]);
    } else if (quotaExceededMessageKey) {
      return NextResponse.json({
        code: Number(body.code) || code || 403,
        statusText: bodyMessage || '',
        message: quotaExceededMessageKey
      });
    } else if (body.code === 403 || body.reason === 'Forbidden') {
      return NextResponse.json(ERROR_RESPONSE[ERROR_ENUM.insufficientPermissions]);
    } else {
      return NextResponse.json({
        code: body.code || code || 500,
        statusText: bodyMessage || '',
        message: bodyMessage || 'Kubernetes error'
      });
    }
  }

  if (error?.statusCode && error.statusCode >= 400) {
    const quotaExceededMessageKey = getQuotaExceededMessageKey(error.message || '');
    if (quotaExceededMessageKey) {
      return NextResponse.json({
        code: error.statusCode,
        statusText: error.message || '',
        message: quotaExceededMessageKey
      });
    }

    if (error.statusCode === 403) {
      return NextResponse.json(ERROR_RESPONSE[ERROR_ENUM.insufficientPermissions]);
    }
    return NextResponse.json({
      code: error.statusCode,
      statusText: error.message || '',
      message: error.message || `HTTP error ${error.statusCode}`
    });
  }

  let msg = message;
  if ((code < 200 || code >= 400) && !message) {
    if (code >= 500) {
      console.log(error);
      msg = 'Internal Server Error';
    } else {
      msg = error?.body?.message || error?.message || 'request error';
    }
    if (typeof error === 'string') {
      msg = error;
    } else if (error?.code && error.code in ERROR_TEXT) {
      msg = ERROR_TEXT[error.code];
    }
    console.log('===jsonRes===\n', error);
  }
  if (code >= 500) {
    return NextResponse.json({
      code,
      statusText: '',
      message: msg
    });
  }
  return NextResponse.json({
    code,
    statusText: '',
    message: msg,
    data: data || error || null
  });
};
