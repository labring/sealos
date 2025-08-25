export type ApiResp<T = unknown> = {
  code: number;
  message: string;
  data?: T;
};

const isApiResp = (x: any): x is ApiResp =>
  typeof x.code === 'number' && typeof x.message === 'string';
export { isApiResp };
