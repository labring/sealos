export type ApiResp<T = any, U = string> = {
  code?: number;
  message?: U;
  data?: T;
};
