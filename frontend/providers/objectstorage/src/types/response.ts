export enum ResponseCode {
  SUCCESS = 200,
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  BALANCE_NOT_ENOUGH = 402,
  FORBIDDEN_CREATE_APP = 403,
  NOT_FOUND = 404,
  APP_ALREADY_EXISTS = 409,
  INTERNAL_SERVER_ERROR = 500
}

export const ResponseMessages: Record<ResponseCode, string> = {
  [ResponseCode.SUCCESS]: 'Success',
  [ResponseCode.BAD_REQUEST]: 'Bad Request',
  [ResponseCode.UNAUTHORIZED]: 'Unauthorized',
  [ResponseCode.BALANCE_NOT_ENOUGH]: 'user_balance_not_enough',
  [ResponseCode.FORBIDDEN_CREATE_APP]: 'forbidden_create_app',
  [ResponseCode.NOT_FOUND]: 'Not Found',
  [ResponseCode.APP_ALREADY_EXISTS]: 'app_already_exists',
  [ResponseCode.INTERNAL_SERVER_ERROR]: 'Internal Server Error'
};

export interface ApiResponse<T = any> {
  code: ResponseCode;
  message: string;
  data?: T;
}
