import { hasTypedProperty } from '@/k8slens/utilities';
import { isError, isNumber, isString } from 'lodash';

/**
 * An error for bug tracking and good error notification.
 */
export class Errno extends Error {
  readonly reason: string;
  readonly code: number;
  readonly errno: number;

  /**
   * Constructs a new instance of the Errno class.
   *
   * @param code Http status code
   * @param message Error detail, should be human readable and informative
   * @param reason Error summary of what caused the error
   * @param errno Internal defined error code
   * @example const err = new Errno("Not Found", "Can't not find a resource called 'error'", 20000);
   */
  constructor(code: number, errno: number, reason?: string, message?: string) {
    super(message ?? 'Sorry, something went wrong and got no supported message for this error.');
    this.name = 'Errno';
    this.reason = reason ?? 'Unknown Error';
    this.code = code;
    this.errno = errno;
  }
}

export function isErrno(err: unknown): err is Errno {
  return (
    isError(err) &&
    err.name === 'Errno' &&
    hasTypedProperty(err, 'reason', isString) &&
    hasTypedProperty(err, 'code', isNumber)
  );
}

export enum ErrnoCode {
  // User error
  UserBadRequest = 10000,
  UserMethodNotAllow = 10001,
  UserUnauthorized = 10002,

  // Server error
  ServerInternalError = 20000,

  // API server error
  APIWatchResponseError = 30000,
  APIWatchRequestError = 30001,
  APIListResponseError = 30002,
  APIListRequestError = 30003,
  APIUpdateRequestError = 30004,
  APIUpdateResponseError = 30005,
  APICreateRequestError = 30006,
  APICreateResponseError = 30007,
  APIDeleteRequestError = 30008,
  APIDeleteResponseError = 30009
}

/**
 * Generates an Errno object based on the given message and ErrnoCode.
 *
 * @warning **It's a simple way to build an Errno object, for building it with more details, use the `Errno` class.**
 *
 * @param message The message to be included in the Errno object.
 * @param errnoCode The ErrnoCode to determine the properties of the Errno object.
 * @return The generated Errno object.
 */
export function buildErrno(message: string, errnoCode: ErrnoCode) {
  switch (errnoCode) {
    case ErrnoCode.UserBadRequest:
      return new Errno(404, errnoCode, 'Bad Request', message);
    case ErrnoCode.UserMethodNotAllow:
      return new Errno(405, errnoCode, 'Method Not Allow', message);
    case ErrnoCode.UserUnauthorized:
      return new Errno(401, errnoCode, 'Unauthorized', message);
    case ErrnoCode.ServerInternalError:
      return new Errno(500, errnoCode, 'Internal Server Error', message);
    default:
      return new Errno(500, errnoCode, 'Internal Server Error', message);
  }
}
