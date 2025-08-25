/**
 * Basic response format for API
 *
 * @warning It is not allowed to use `BasicResponse` as a return type in API
 */
type BasicResponse = {
  code: number;
};

/**
 * Basic error response format for API
 *
 * @example const resp: ErrorResponse = {code: 404, error: {errno: 10000, message: "Not Found", reason: "Can't not find a resource called 'error'"}}
 */
type ErrorResponse = Merge<
  BasicResponse,
  { error: { errno: number; message: string; reason: string } }
>;

/**
 * Basic success response format for API
 *
 * @example const resp: SuccessResponse<{message: string}> = {code: 200, errno: 0, data: {message: "Success"}}
 */
type SuccessResponse<T> = Merge<BasicResponse, { data: T }>;

type ApiPrefix = 'api' | 'apis';
type ApiGroup = string;
type ApiVersion = 'v1';

/**
 * Kubernetes API URL Params
 */
type KubeApiUrlParams = {
  apiPrefix: ApiPrefix;
  apiGroup?: ApiGroup;
  apiVersion: ApiVersion;
  resource: string;
};
