export enum ResponseCode {
  SUCCESS = 200,
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
  SERVER_ERROR = 500,

  BALANCE_NOT_ENOUGH = 40001,
  FORBIDDEN_CREATE_APP = 40003
}

export const ResponseMessages: Record<ResponseCode | number, string> = {
  [ResponseCode.SUCCESS]: '成功',
  [ResponseCode.BAD_REQUEST]: '请求参数错误',
  [ResponseCode.UNAUTHORIZED]: '未授权，请重新登录',
  [ResponseCode.FORBIDDEN]: '权限不足',
  [ResponseCode.NOT_FOUND]: '请求资源不存在',
  [ResponseCode.SERVER_ERROR]: '服务器错误',
  [ResponseCode.BALANCE_NOT_ENOUGH]: '账户余额不足，请充值后重试',
  [ResponseCode.FORBIDDEN_CREATE_APP]:
    '抱歉，您在当前工作空间没有足够的权限来创建应用。请联系该工作空间的 owner (所有者) 为您授权。'
};

export interface ApiResponse<T = any> {
  code: number;
  message: string;
  data?: T;
  error?: any;
}
