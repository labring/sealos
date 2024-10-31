export type ApiResp<Tdata = unknown> = {
  code?: number;
  message?: string;
  data?: Tdata;
  error?: unknown;
};

export const isApiResp = (x: unknown): x is ApiResp =>
  typeof x.code === 'number' && typeof x.message === 'string';
