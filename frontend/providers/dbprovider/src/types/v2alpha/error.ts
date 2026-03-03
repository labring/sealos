import { z } from 'zod';
import { NextApiResponse } from 'next';
import {
  ErrorType,
  ErrorCode,
  buildErrorBody,
  buildValidationErrorBody
} from '@sealos/shared/server/v2alpha';

export { ErrorType, ErrorCode, buildErrorBody, buildValidationErrorBody };
export type {
  ErrorTypeValue,
  ErrorCodeType,
  ApiErrorResponse
} from '@sealos/shared/server/v2alpha';

import type { ErrorTypeValue, ErrorCodeType } from '@sealos/shared/server/v2alpha';

// ============================================================================
// OpenAPI schemas — local, built with this provider's zod (v4 + zod-openapi v5)
// Uses .describe() style (zod-openapi v5 reads native zod .describe())
// Cannot be shared: zod schemas are zod-version-bound
// ============================================================================

const ValidationFieldIssue = z.object({
  field: z.string().describe('Field path using dot/bracket notation, e.g. "resource.cpu"'),
  message: z.string().describe('Validation error message for this field')
});

export const ErrorResponseSchema = z.object({
  error: z.object({
    type: z
      .enum(Object.values(ErrorType) as [ErrorTypeValue, ...ErrorTypeValue[]])
      .describe('High-level error type for categorization (e.g. "validation_error")'),
    code: z
      .enum(Object.values(ErrorCode) as [ErrorCodeType, ...ErrorCodeType[]])
      .describe(
        'Specific error code for programmatic handling and i18n (e.g. "INVALID_PARAMETER")'
      ),
    message: z.string().describe('Human-readable error message'),
    details: z
      .union([z.array(z.object({ field: z.string(), message: z.string() })), z.string()])
      .optional()
      .describe(
        'Extra context. For INVALID_PARAMETER: Array<{ field, message }>. For operation/internal errors: raw error string. Omitted for other codes.'
      )
  })
});

// Code → type mapping for 400 (per design doc)
const ERROR_400_CODE_TO_TYPE: Record<string, ErrorTypeValue> = {
  [ErrorCode.INVALID_PARAMETER]: ErrorType.VALIDATION_ERROR,
  [ErrorCode.INVALID_VALUE]: ErrorType.VALIDATION_ERROR,
  [ErrorCode.UNSUPPORTED_OPERATION]: ErrorType.CLIENT_ERROR,
  [ErrorCode.STORAGE_REQUIRES_STATEFULSET]: ErrorType.CLIENT_ERROR
};

export type Error400Code =
  | typeof ErrorCode.INVALID_PARAMETER
  | typeof ErrorCode.INVALID_VALUE
  | typeof ErrorCode.UNSUPPORTED_OPERATION
  | typeof ErrorCode.STORAGE_REQUIRES_STATEFULSET;

/**
 * Create a 400 error schema. Each endpoint passes the codes it can return.
 */
export function createError400Schema(codes: readonly [Error400Code, ...Error400Code[]]) {
  const uniqueTypes = [...new Set(codes.map((c) => ERROR_400_CODE_TO_TYPE[c]))] as [
    ErrorTypeValue,
    ...ErrorTypeValue[]
  ];
  return z.object({
    error: z.object({
      type: z.enum(uniqueTypes).describe('High-level error type for categorization'),
      code: z
        .enum(codes as [ErrorCodeType, ...ErrorCodeType[]])
        .describe('Specific error code for programmatic handling and i18n'),
      message: z.string().describe('Human-readable error message'),
      details: z
        .union([z.array(ValidationFieldIssue), z.string()])
        .optional()
        .describe(
          'For INVALID_PARAMETER: Array<{ field, message }>. For INVALID_VALUE: optional string. Omitted for other codes.'
        )
    })
  });
}

/** Create 401 error schema. */
export function createError401Schema() {
  return z.object({
    error: z.object({
      type: z
        .literal(ErrorType.AUTHENTICATION_ERROR)
        .describe('High-level error type for categorization'),
      code: z
        .literal(ErrorCode.AUTHENTICATION_REQUIRED)
        .describe('Specific error code for programmatic handling and i18n'),
      message: z.string().describe('Human-readable error message'),
      details: z
        .string()
        .optional()
        .describe('Typically omitted. May contain additional context in edge cases.')
    })
  });
}

export type Error403Code =
  | typeof ErrorCode.PERMISSION_DENIED
  | typeof ErrorCode.INSUFFICIENT_BALANCE;

/**
 * Create a 403 error schema. Each endpoint passes the codes it can return.
 */
export function createError403Schema(codes: readonly [Error403Code, ...Error403Code[]]) {
  return z.object({
    error: z.object({
      type: z
        .literal(ErrorType.AUTHORIZATION_ERROR)
        .describe('High-level error type for categorization'),
      code: z
        .enum(codes as [ErrorCodeType, ...ErrorCodeType[]])
        .describe('Specific error code for programmatic handling and i18n'),
      message: z.string().describe('Human-readable error message'),
      details: z
        .string()
        .optional()
        .describe('Typically omitted. May contain additional context in edge cases.')
    })
  });
}

/** Create 404 error schema. */
export function createError404Schema() {
  return z.object({
    error: z.object({
      type: z
        .literal(ErrorType.RESOURCE_ERROR)
        .describe('High-level error type for categorization'),
      code: z
        .literal(ErrorCode.NOT_FOUND)
        .describe('Specific error code for programmatic handling and i18n'),
      message: z.string().describe('Human-readable error message'),
      details: z
        .string()
        .optional()
        .describe('Typically omitted. May contain additional context in edge cases.')
    })
  });
}

export type Error409Code = typeof ErrorCode.ALREADY_EXISTS | typeof ErrorCode.CONFLICT;

/**
 * Create a 409 error schema. Each endpoint passes the codes it can return.
 */
export function createError409Schema(codes: readonly [Error409Code, ...Error409Code[]]) {
  return z.object({
    error: z.object({
      type: z
        .literal(ErrorType.RESOURCE_ERROR)
        .describe('High-level error type for categorization'),
      code: z
        .enum(codes as [ErrorCodeType, ...ErrorCodeType[]])
        .describe('Specific error code for programmatic handling and i18n'),
      message: z.string().describe('Human-readable error message'),
      details: z
        .string()
        .optional()
        .describe('Typically omitted. May contain additional context in edge cases.')
    })
  });
}

const ERROR_500_CODE_TO_TYPE: Record<string, ErrorTypeValue> = {
  [ErrorCode.KUBERNETES_ERROR]: ErrorType.OPERATION_ERROR,
  [ErrorCode.STORAGE_UPDATE_FAILED]: ErrorType.OPERATION_ERROR,
  [ErrorCode.OPERATION_FAILED]: ErrorType.OPERATION_ERROR,
  [ErrorCode.INTERNAL_ERROR]: ErrorType.INTERNAL_ERROR
};

export type Error500Code =
  | typeof ErrorCode.KUBERNETES_ERROR
  | typeof ErrorCode.STORAGE_UPDATE_FAILED
  | typeof ErrorCode.OPERATION_FAILED
  | typeof ErrorCode.INTERNAL_ERROR;

/**
 * Create a 500 error schema. Each endpoint passes the codes it can return.
 */
export function createError500Schema(codes: readonly [Error500Code, ...Error500Code[]]) {
  const uniqueTypes = [...new Set(codes.map((c) => ERROR_500_CODE_TO_TYPE[c]))] as [
    ErrorTypeValue,
    ...ErrorTypeValue[]
  ];
  return z.object({
    error: z.object({
      type: z.enum(uniqueTypes).describe('High-level error type for categorization'),
      code: z
        .enum(codes as [ErrorCodeType, ...ErrorCodeType[]])
        .describe('Specific error code for programmatic handling and i18n'),
      message: z.string().describe('Human-readable error message'),
      details: z
        .string()
        .optional()
        .describe('Raw error string from the underlying system, for troubleshooting.')
    })
  });
}

/** Create 503 error schema. */
export function createError503Schema() {
  return z.object({
    error: z.object({
      type: z
        .literal(ErrorType.INTERNAL_ERROR)
        .describe('High-level error type for categorization'),
      code: z
        .literal(ErrorCode.SERVICE_UNAVAILABLE)
        .describe('Specific error code for programmatic handling and i18n'),
      message: z.string().describe('Human-readable error message'),
      details: z
        .string()
        .optional()
        .describe('Raw connection error from the underlying system (e.g. ECONNREFUSED).')
    })
  });
}

export const Error400Schema = z.object({
  error: z.object({
    type: z
      .enum([ErrorType.VALIDATION_ERROR, ErrorType.CLIENT_ERROR])
      .describe('High-level error type for categorization'),
    code: z
      .enum([
        ErrorCode.INVALID_PARAMETER,
        ErrorCode.INVALID_VALUE,
        ErrorCode.UNSUPPORTED_OPERATION,
        ErrorCode.STORAGE_REQUIRES_STATEFULSET
      ])
      .describe('Specific error code for programmatic handling and i18n'),
    message: z.string().describe('Human-readable error message'),
    details: z
      .union([z.array(ValidationFieldIssue), z.string()])
      .optional()
      .describe(
        'For INVALID_PARAMETER: Array<{ field, message }>. For INVALID_VALUE: optional string. Omitted for other codes.'
      )
  })
});

export const Error401Schema = z.object({
  error: z.object({
    type: z
      .literal(ErrorType.AUTHENTICATION_ERROR)
      .describe('High-level error type for categorization'),
    code: z
      .literal(ErrorCode.AUTHENTICATION_REQUIRED)
      .describe('Specific error code for programmatic handling and i18n'),
    message: z.string().describe('Human-readable error message'),
    details: z
      .string()
      .optional()
      .describe('Typically omitted. May contain additional context in edge cases.')
  })
});

export const Error403Schema = z.object({
  error: z.object({
    type: z
      .literal(ErrorType.AUTHORIZATION_ERROR)
      .describe('High-level error type for categorization'),
    code: z
      .enum([ErrorCode.PERMISSION_DENIED, ErrorCode.INSUFFICIENT_BALANCE])
      .describe('Specific error code for programmatic handling and i18n'),
    message: z.string().describe('Human-readable error message'),
    details: z
      .string()
      .optional()
      .describe('Typically omitted. May contain additional context in edge cases.')
  })
});

export const Error404Schema = z.object({
  error: z.object({
    type: z.literal(ErrorType.RESOURCE_ERROR).describe('High-level error type for categorization'),
    code: z
      .literal(ErrorCode.NOT_FOUND)
      .describe('Specific error code for programmatic handling and i18n'),
    message: z.string().describe('Human-readable error message'),
    details: z
      .string()
      .optional()
      .describe('Typically omitted. May contain additional context in edge cases.')
  })
});

export const Error405Schema = z.object({
  error: z.object({
    type: z.literal(ErrorType.CLIENT_ERROR).describe('High-level error type for categorization'),
    code: z
      .literal(ErrorCode.METHOD_NOT_ALLOWED)
      .describe('Specific error code for programmatic handling and i18n'),
    message: z.string().describe('Human-readable error message'),
    details: z.string().optional().describe('Typically omitted.')
  })
});

export const Error409Schema = z.object({
  error: z.object({
    type: z.literal(ErrorType.RESOURCE_ERROR).describe('High-level error type for categorization'),
    code: z
      .enum([ErrorCode.ALREADY_EXISTS, ErrorCode.CONFLICT])
      .describe('Specific error code for programmatic handling and i18n'),
    message: z.string().describe('Human-readable error message'),
    details: z
      .string()
      .optional()
      .describe('Typically omitted. May contain additional context in edge cases.')
  })
});

export const Error500Schema = z.object({
  error: z.object({
    type: z
      .enum([ErrorType.OPERATION_ERROR, ErrorType.INTERNAL_ERROR])
      .describe('High-level error type for categorization'),
    code: z
      .enum([
        ErrorCode.KUBERNETES_ERROR,
        ErrorCode.STORAGE_UPDATE_FAILED,
        ErrorCode.OPERATION_FAILED,
        ErrorCode.INTERNAL_ERROR
      ])
      .describe('Specific error code for programmatic handling and i18n'),
    message: z.string().describe('Human-readable error message'),
    details: z
      .string()
      .optional()
      .describe('Raw error string from the underlying system, for troubleshooting.')
  })
});

export const Error503Schema = z.object({
  error: z.object({
    type: z.literal(ErrorType.INTERNAL_ERROR).describe('High-level error type for categorization'),
    code: z
      .literal(ErrorCode.SERVICE_UNAVAILABLE)
      .describe('Specific error code for programmatic handling and i18n'),
    message: z.string().describe('Human-readable error message'),
    details: z
      .string()
      .optional()
      .describe('Raw error string from the underlying system, for troubleshooting.')
  })
});

// ============================================================================
// OpenAPI helper — local, each provider defines its own
// ============================================================================

export function createErrorExample(
  type: ErrorTypeValue,
  code: ErrorCodeType,
  message: string,
  details?: unknown
) {
  return {
    error: {
      type,
      code,
      message,
      ...(details !== undefined && { details })
    }
  };
}

// ============================================================================
// Pages Router thin wrappers (Next.js pages/api/)
// ============================================================================

/**
 * Send a standardized error response (Pages Router).
 *
 * @example
 * sendError(res, {
 *   status: 404,
 *   type: ErrorType.RESOURCE_ERROR,
 *   code: ErrorCode.NOT_FOUND,
 *   message: 'Database "my-db" not found.'
 * });
 */
export function sendError(
  res: NextApiResponse,
  config: {
    status: number;
    type: ErrorTypeValue;
    code: ErrorCodeType;
    message: string;
    details?: unknown;
  }
): void {
  res.status(config.status).json(buildErrorBody(config as any));
}

/**
 * Send a validation error response (Pages Router).
 * Transforms ZodError issues into { field, message }[] format per API contract.
 *
 * @example
 * sendValidationError(res, zodError, 'Request body validation failed.');
 */
export function sendValidationError(
  res: NextApiResponse,
  error: { issues: Array<{ path: Array<string | number | symbol>; message: string }> },
  message: string = 'Validation failed'
): void {
  res.status(400).json(buildValidationErrorBody(error, message));
}

/**
 * Translate a raw Kubernetes API error into a v2alpha error response.
 * Replaces the `jsonRes(res, handleK8sError(err))` pattern.
 *
 * Mapping:
 *   TCP connection failure (ECONNREFUSED / ETIMEDOUT / ENOTFOUND / ECONNRESET)
 *                                             → HTTP 503 SERVICE_UNAVAILABLE
 *   K8s 403 + "account balance less than 0"  → HTTP 403 INSUFFICIENT_BALANCE
 *   K8s 403 (other)                           → HTTP 403 PERMISSION_DENIED
 *   K8s 409 + "already exists"               → HTTP 409 ALREADY_EXISTS
 *   everything else                           → HTTP 500 KUBERNETES_ERROR
 */
export function sendK8sError(res: NextApiResponse, err: any): void {
  const NETWORK_ERROR_CODES = ['ECONNREFUSED', 'ETIMEDOUT', 'ENOTFOUND', 'ECONNRESET'];
  if (err?.code && NETWORK_ERROR_CODES.includes(err.code)) {
    return sendError(res, {
      status: 503,
      type: ErrorType.INTERNAL_ERROR,
      code: ErrorCode.SERVICE_UNAVAILABLE,
      message: 'The Kubernetes cluster is temporarily unreachable.',
      details: err.message
    });
  }

  const body = err?.body ?? err;

  if (body?.kind === 'Status' && body?.apiVersion === 'v1') {
    if (body.code === 403) {
      const isBalance =
        typeof body.message === 'string' && body.message.includes('account balance less than 0');
      return sendError(res, {
        status: 403,
        type: ErrorType.AUTHORIZATION_ERROR,
        code: isBalance ? ErrorCode.INSUFFICIENT_BALANCE : ErrorCode.PERMISSION_DENIED,
        message: isBalance
          ? 'Insufficient balance to perform this operation.'
          : 'Insufficient permissions to perform this operation.',
        details: body.message
      });
    }

    if (body.code === 409) {
      const isAlreadyExists =
        typeof body.message === 'string' && body.message.includes('already exists');
      return sendError(res, {
        status: 409,
        type: ErrorType.RESOURCE_ERROR,
        code: isAlreadyExists ? ErrorCode.ALREADY_EXISTS : ErrorCode.CONFLICT,
        message: isAlreadyExists
          ? 'Resource already exists.'
          : 'A conflicting operation is already in progress.',
        details: body.message
      });
    }
  }

  return sendError(res, {
    status: 500,
    type: ErrorType.OPERATION_ERROR,
    code: ErrorCode.KUBERNETES_ERROR,
    message: 'A Kubernetes API call failed.',
    details: body?.message ?? String(err)
  });
}
