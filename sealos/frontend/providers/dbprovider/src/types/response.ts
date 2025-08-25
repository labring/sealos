export enum ResponseCode {
  SUCCESS = 200,
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
  SERVER_ERROR = 500,

  BALANCE_NOT_ENOUGH = 40001,
  FORBIDDEN_CREATE_APP = 40003,
  APP_ALREADY_EXISTS = 40009
}

export const ResponseMessages: Record<ResponseCode | number, string> = {
  [ResponseCode.SUCCESS]: 'Success',
  [ResponseCode.BAD_REQUEST]: 'Invalid request parameters',
  [ResponseCode.UNAUTHORIZED]: 'Unauthorized, please login again',
  [ResponseCode.FORBIDDEN]: 'Insufficient permissions',
  [ResponseCode.NOT_FOUND]: 'Requested resource not found',
  [ResponseCode.SERVER_ERROR]: 'Server error',
  [ResponseCode.BALANCE_NOT_ENOUGH]:
    'Almost there! You need additional credits for this deployment.',
  [ResponseCode.FORBIDDEN_CREATE_APP]:
    'You do not have sufficient permissions to create an application in the current workspace. Please contact the owner of the workspace to request the necessary permissions.',
  [ResponseCode.APP_ALREADY_EXISTS]:
    'App name already exists. Please use a different name or check your app list.'
};

export interface ApiResponse<T = any> {
  code: number;
  message: string;
  data?: T;
  error?: any;
}
