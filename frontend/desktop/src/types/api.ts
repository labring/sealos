export type ApiResp<T = any> = {
  code?: number;
  message?: string;
  data?: T;
};
