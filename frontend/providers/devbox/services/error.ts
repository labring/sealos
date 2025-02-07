export const ERROR_TEXT: Record<string, string> = {
  ETIMEDOUT: 'server timeout'
};
export const openaiError: Record<string, string> = {
  context_length_exceeded: 'content too long, please reset the conversation',
  Unauthorized: 'API-KEY is invalid',
  rate_limit_reached: 'API is limited, please try again later',
  'Bad Request': 'Bad Request~ maybe content too many',
  'Too Many Requests': 'request too many, please slow down~',
  'Bad Gateway': 'gateway error, please try again'
};
export const proxyError: Record<string, boolean> = {
  ECONNABORTED: true,
  ECONNRESET: true
};

export enum ERROR_ENUM {
  unAuthorization = 'unAuthorization',
  outstandingPayment = 'outstandingPayment'
}
export const ERROR_RESPONSE: Record<
  any,
  {
    code: number;
    statusText: string;
    message: string;
    data?: any;
  }
> = {
  [ERROR_ENUM.unAuthorization]: {
    code: 403,
    statusText: ERROR_ENUM.unAuthorization,
    message: 'credential error'
  },
  [ERROR_ENUM.outstandingPayment]: {
    code: 402,
    statusText: ERROR_ENUM.outstandingPayment,
    message: 'outstanding payment'
  }
};
