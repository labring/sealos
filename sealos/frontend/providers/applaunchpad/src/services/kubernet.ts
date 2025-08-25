export interface ApiResp<T = any> {
  code: number;
  message: string;
  data?: T;
}
