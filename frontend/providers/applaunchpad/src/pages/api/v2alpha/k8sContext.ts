import type { NextApiRequest, NextApiResponse } from 'next';
import { createK8sContext } from '@/services/backend';
import type { K8sContext } from '@/services/backend';
import { sendError, ErrorType, ErrorCode } from '@/types/v2alpha/error';

/**
 * Auth/kubeconfig error identifiers from authSession and getK8s.
 * When createK8sContext throws these, map to 401.
 */
const AUTH_ERROR_INDICATORS = [
  'unAuthorization',
  '用户不存在',
  'Unauthorized',
  'unauthorized',
  'invalid kubeconfig',
  'kubeconfig'
];

/**
 * Kubernetes cluster unavailable indicators (connection/network errors).
 */
const UNAVAILABLE_INDICATORS = [
  'ECONNREFUSED',
  'ETIMEDOUT',
  'ENOTFOUND',
  'unavailable',
  'connection refused',
  'network'
];

/**
 * Create K8s context from request, or send appropriate error response.
 * Returns K8sContext on success, or null if an error was sent (caller should return).
 */
export async function getK8sContextOrSendError(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<K8sContext | null> {
  try {
    return await createK8sContext(req);
  } catch (err: unknown) {
    const errMessage = err instanceof Error ? err.message : String(err);
    const errStr = errMessage.toLowerCase();

    // 401 Unauthorized - Missing/invalid auth or kubeconfig
    if (AUTH_ERROR_INDICATORS.some((indicator) => errStr.includes(indicator.toLowerCase()))) {
      sendError(res, {
        status: 401,
        type: ErrorType.AUTHENTICATION_ERROR,
        code: ErrorCode.AUTHENTICATION_REQUIRED,
        message:
          'Authentication required. Please provide valid credentials in the Authorization header.',
        details: errMessage
      });
      return null;
    }

    // 503 Service Unavailable - K8s cluster unreachable
    if (UNAVAILABLE_INDICATORS.some((indicator) => errStr.includes(indicator.toLowerCase()))) {
      sendError(res, {
        status: 503,
        type: ErrorType.INTERNAL_ERROR,
        code: ErrorCode.SERVICE_UNAVAILABLE,
        message: 'Kubernetes cluster is temporarily unavailable. Please try again later.',
        details: errMessage
      });
      return null;
    }

    // 500 Internal Server Error - Unexpected init error
    sendError(res, {
      status: 500,
      type: ErrorType.INTERNAL_ERROR,
      code: ErrorCode.INTERNAL_ERROR,
      message:
        'Failed to initialize Kubernetes context. Please check your configuration and try again.',
      details: errMessage
    });
    return null;
  }
}

/**
 * Extract message from K8s API error (various shapes from @kubernetes/client-node).
 */
function getK8sErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  const anyErr = err as Record<string, unknown>;
  const body = anyErr?.body as Record<string, unknown> | undefined;
  if (body?.message && typeof body.message === 'string') return body.message;
  if (anyErr?.message && typeof anyErr.message === 'string') return anyErr.message;
  return String(err);
}

/**
 * Get HTTP status code from K8s API error if present.
 */
function getK8sStatusCode(err: unknown): number | undefined {
  const anyErr = err as { response?: { statusCode?: number }; body?: { code?: number } };
  const code = anyErr?.response?.statusCode ?? anyErr?.body?.code;
  if (typeof code === 'number') return code;
  return undefined;
}

/**
 * Check if K8s error indicates AlreadyExists (409).
 */
function isAlreadyExistsError(err: unknown): boolean {
  const anyErr = err as { body?: { reason?: string } };
  const reason = anyErr?.body?.reason;
  return (
    getK8sStatusCode(err) === 409 ||
    (typeof reason === 'string' && reason.toLowerCase() === 'alreadyexists')
  );
}

/**
 * Send appropriate error response for K8s API operation failures.
 * Maps 403 -> 403 Forbidden, connection errors -> 503, others -> 500 operation_error.
 * Use for errors thrown by K8s API calls; for truly unexpected exceptions use sendInternalError.
 * @param defaultCode - Error code for 500 responses; defaults to KUBERNETES_ERROR.
 */
export function sendK8sOperationError(
  res: NextApiResponse,
  err: unknown,
  defaultMessage: string,
  defaultCode:
    | typeof ErrorCode.KUBERNETES_ERROR
    | typeof ErrorCode.STORAGE_UPDATE_FAILED
    | typeof ErrorCode.OPERATION_FAILED = ErrorCode.KUBERNETES_ERROR
): void {
  const errMessage = getK8sErrorMessage(err);
  const errStr = errMessage.toLowerCase();
  const statusCode = getK8sStatusCode(err);

  // 403 Forbidden - K8s permission denied
  if (statusCode === 403 || errStr.includes('forbidden') || errStr.includes('permission denied')) {
    sendError(res, {
      status: 403,
      type: ErrorType.AUTHORIZATION_ERROR,
      code: ErrorCode.PERMISSION_DENIED,
      message:
        'Insufficient permissions to perform this operation. Please check your access rights.',
      details: errMessage
    });
    return;
  }

  // 409 Conflict - Resource already exists
  if (isAlreadyExistsError(err)) {
    sendError(res, {
      status: 409,
      type: ErrorType.RESOURCE_ERROR,
      code: ErrorCode.ALREADY_EXISTS,
      message:
        'An application with this name already exists in the current namespace. Use a different name.',
      details: errMessage
    });
    return;
  }

  // 422 Unprocessable Entity - Admission webhook rejected, invalid spec, quota exceeded
  if (statusCode === 422) {
    sendError(res, {
      status: 422,
      type: ErrorType.OPERATION_ERROR,
      code: ErrorCode.INVALID_RESOURCE_SPEC,
      message:
        'The resource specification was rejected by the cluster. Check admission webhooks, field constraints, and quota limits.',
      details: errMessage
    });
    return;
  }

  // 503 Service Unavailable - Cluster unreachable
  if (
    statusCode === 503 ||
    UNAVAILABLE_INDICATORS.some((indicator) => errStr.includes(indicator.toLowerCase()))
  ) {
    sendError(res, {
      status: 503,
      type: ErrorType.INTERNAL_ERROR,
      code: ErrorCode.SERVICE_UNAVAILABLE,
      message: 'Kubernetes cluster is temporarily unavailable. Please try again later.',
      details: errMessage
    });
    return;
  }

  // 500 - Other K8s operation errors
  sendError(res, {
    status: 500,
    type: ErrorType.OPERATION_ERROR,
    code: defaultCode,
    message: defaultMessage,
    details: errMessage
  });
}

/**
 * Send 500 internal_error response for truly unexpected exceptions (programming errors,
 * unhandled edge cases). Use in outer catch blocks, not for K8s API call failures.
 */
export function sendInternalError(res: NextApiResponse, err: unknown, message: string): void {
  const errMessage = getK8sErrorMessage(err);
  sendError(res, {
    status: 500,
    type: ErrorType.INTERNAL_ERROR,
    code: ErrorCode.INTERNAL_ERROR,
    message,
    details: errMessage
  });
}
