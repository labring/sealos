export interface ApiResp<T = any> {
  code: number;
  message: string;
  errorCode?: string | number;
  data?: T;
}

const isApiResp = (x: any): x is ApiResp =>
  typeof x.code === 'number' && typeof x.message === 'string';
export { isApiResp };
