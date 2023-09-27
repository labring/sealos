export interface BasicRespond {
  code: number;
  message: string;
  data?: any;
}

export const isApiResp = (data: any): boolean =>
  typeof data.code === "number" && typeof data.message === "string";
