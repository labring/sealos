import { NextApiResponse } from 'next';
import { Errno, ErrnoCode, buildErrno, isErrno } from './error';
import { isAxiosError } from 'axios';
import { KubeStatus } from '@/types/kube-resource';

/**
 * Builds an error response.
 *
 * @param error - The error object or value.
 * @returns `ErrorResponse`
 */
export function buildErrorResponse(error: unknown) {
  let errResp: ErrorResponse;
  if (isErrno(error)) {
    errResp = {
      code: error.code,
      error: {
        errno: error.errno,
        message: error.message,
        reason: error.reason
      }
    };
  } else {
    errResp = buildErrorResponse(
      buildErrno("It's not your problem, it's ours", ErrnoCode.ServerInternalError)
    );
  }
  return errResp;
}

/**
 * Sends an error response to the Next.js API response object.
 *
 * @param res The Next.js API response object.
 * @param error The error object.
 */
export function sendErrorResponse(res: NextApiResponse<ErrorResponse>, error: Error) {
  const errResp = buildErrorResponse(error);
  res.status(errResp.code).json(errResp);
}

/**
 *
 *
 * @param error A error object can be not a `AxiosError` object.
 * @param reqErrnoCode ErrnoCode for the API request error.
 * @param respErrnoCode ErrnoCode for the API response error.
 *
 * @returns An `Errno` object or original error object determining is `AxiosError` or not.
 */
export function handlerAxiosError(error: Error, reqErrnoCode: ErrnoCode, respErrnoCode: ErrnoCode) {
  if (!isAxiosError(error)) return error;
  if (error.response) {
    const kubeStatus = error.response.data as KubeStatus;
    return new Errno(error.response.status, respErrnoCode, kubeStatus.reason, kubeStatus.message);
  }
  return new Errno(500, reqErrnoCode, error.name, error.message);
}
