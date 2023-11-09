export type ApiResp = {
  code?: number;
  message?: string;
  data?: any;
  error?: any;
};

export const isApiResp = (x: any): x is ApiResp =>
  typeof x.code === 'number' && typeof x.message === 'string';
