export type ApiResp<Tdata = any> = {
  code?: number;
  message?: string;
  data?: Tdata;
  error?: any;
};

export const isApiResp = (x: any): x is ApiResp =>
  typeof x.code === 'number' && typeof x.message === 'string';
