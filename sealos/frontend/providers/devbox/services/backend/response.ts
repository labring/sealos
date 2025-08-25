import { NextResponse } from 'next/server';

import { V1Status } from '@kubernetes/client-node';
import { ERROR_ENUM, ERROR_RESPONSE, ERROR_TEXT } from '../error';

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
  if (body instanceof V1Status) {
    if (body.message?.includes('40001:')) {
      return NextResponse.json(ERROR_RESPONSE[ERROR_ENUM.outstandingPayment]);
    } else {
      return NextResponse.json({
        code: 500,
        statusText: body.message,
        message: body.message
      });
    }
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
