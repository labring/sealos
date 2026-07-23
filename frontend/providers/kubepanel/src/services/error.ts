export const ERROR_TEXT: Record<string, string> = {
  ETIMEDOUT: 'Server timeout'
};
export const openaiError: Record<string, string> = {
  context_length_exceeded: 'Context length exceeded, please reset the conversation.',
  Unauthorized: 'API key is invalid.',
  rate_limit_reached: 'API rate limited, please try again later.',
  'Bad Request': 'Bad Request — possibly too much content.',
  'Too Many Requests': 'Too many requests, please slow down.',
  'Bad Gateway': 'Bad Gateway, please retry.'
};
export const proxyError: Record<string, boolean> = {
  ECONNABORTED: true,
  ECONNRESET: true
};

export enum ERROR_ENUM {
  unAuthorization = 'unAuthorization'
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
    message: 'Invalid credentials'
  }
};
