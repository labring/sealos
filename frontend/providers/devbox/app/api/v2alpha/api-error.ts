import { NextResponse } from 'next/server';
import { z } from 'zod';

import {
  buildErrorBody,
  buildValidationErrorBody,
  ErrorCode,
  ErrorType
} from '@sealos/shared/server/v2alpha';

export { buildErrorBody, buildValidationErrorBody, ErrorCode, ErrorType };
export type {
  ApiErrorResponse,
  ApiErrorDetails,
  ErrorCodeType,
  ErrorTypeValue
} from '@sealos/shared/server/v2alpha';

import type { ApiErrorDetails, ErrorCodeType, ErrorTypeValue } from '@sealos/shared/server/v2alpha';

// ============================================================================
// OpenAPI schemas — follow docs/v2alpha-api-error-design.md
// Use create*Schema for endpoint-specific codes; schemas narrow type/code accordingly
// ============================================================================

const ValidationFieldIssue = z.object({
  field: z.string(),
  message: z.string()
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

/** Create a 400 error schema. Each endpoint passes the codes it can return. */
export function createError400Schema(codes: readonly [Error400Code, ...Error400Code[]]) {
  const uniqueTypes = [...new Set(codes.map((c) => ERROR_400_CODE_TO_TYPE[c]))] as [
    ErrorTypeValue,
    ...ErrorTypeValue[]
  ];
  return z.object({
    error: z.object({
      type: z.enum(uniqueTypes),
      code: z.enum(codes as [ErrorCodeType, ...ErrorCodeType[]]),
      message: z.string(),
      details: z.union([z.array(ValidationFieldIssue), z.string()]).optional()
    })
  });
}

/** Create 401 error schema. */
export function createError401Schema() {
  return z.object({
    error: z.object({
      type: z.literal(ErrorType.AUTHENTICATION_ERROR),
      code: z.literal(ErrorCode.AUTHENTICATION_REQUIRED),
      message: z.string(),
      details: z.string().optional()
    })
  });
}

export type Error403Code =
  | typeof ErrorCode.PERMISSION_DENIED
  | typeof ErrorCode.INSUFFICIENT_BALANCE;

/** Create a 403 error schema. Each endpoint passes the codes it can return. */
export function createError403Schema(codes: readonly [Error403Code, ...Error403Code[]]) {
  return z.object({
    error: z.object({
      type: z.literal(ErrorType.AUTHORIZATION_ERROR),
      code: z.enum(codes as [ErrorCodeType, ...ErrorCodeType[]]),
      message: z.string(),
      details: z.string().optional()
    })
  });
}

/** Create 404 error schema. */
export function createError404Schema() {
  return z.object({
    error: z.object({
      type: z.literal(ErrorType.RESOURCE_ERROR),
      code: z.literal(ErrorCode.NOT_FOUND),
      message: z.string(),
      details: z.string().optional()
    })
  });
}

/** Create 405 error schema. */
export function createError405Schema() {
  return z.object({
    error: z.object({
      type: z.literal(ErrorType.CLIENT_ERROR),
      code: z.literal(ErrorCode.METHOD_NOT_ALLOWED),
      message: z.string(),
      details: z.string().optional()
    })
  });
}

export type Error409Code = typeof ErrorCode.ALREADY_EXISTS | typeof ErrorCode.CONFLICT;

/** Create a 409 error schema. Each endpoint passes the codes it can return. */
export function createError409Schema(codes: readonly [Error409Code, ...Error409Code[]]) {
  return z.object({
    error: z.object({
      type: z.literal(ErrorType.RESOURCE_ERROR),
      code: z.enum(codes as [ErrorCodeType, ...ErrorCodeType[]]),
      message: z.string(),
      details: z.string().optional()
    })
  });
}

/** Create 422 error schema. */
export function createError422Schema() {
  return z.object({
    error: z.object({
      type: z.literal(ErrorType.OPERATION_ERROR),
      code: z.literal(ErrorCode.INVALID_RESOURCE_SPEC),
      message: z.string(),
      details: z.string().optional()
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

/** Create a 500 error schema. Each endpoint passes the codes it can return. */
export function createError500Schema(codes: readonly [Error500Code, ...Error500Code[]]) {
  const uniqueTypes = [...new Set(codes.map((c) => ERROR_500_CODE_TO_TYPE[c]))] as [
    ErrorTypeValue,
    ...ErrorTypeValue[]
  ];
  return z.object({
    error: z.object({
      type: z.enum(uniqueTypes),
      code: z.enum(codes as [ErrorCodeType, ...ErrorCodeType[]]),
      message: z.string(),
      details: z.string().optional()
    })
  });
}

/** Create 503 error schema. */
export function createError503Schema() {
  return z.object({
    error: z.object({
      type: z.literal(ErrorType.INTERNAL_ERROR),
      code: z.literal(ErrorCode.SERVICE_UNAVAILABLE),
      message: z.string(),
      details: z.string().optional()
    })
  });
}

/**
 * Create a canonical error example for OpenAPI documentation.
 * @param type - Error type
 * @param code - Error code
 * @param message - Human-readable message
 * @param details - Optional; shape depends on code (array for INVALID_PARAMETER, string for K8s errors)
 */
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
// App Router helpers — return NextResponse (not void)
// ============================================================================

/**
 * Returns a standardized v2alpha error NextResponse (App Router).
 *
 * @example
 * return sendError({
 *   status: 404,
 *   type: ErrorType.RESOURCE_ERROR,
 *   code: ErrorCode.NOT_FOUND,
 *   message: 'Devbox not found.'
 * })
 */
export function sendError(config: {
  status: number;
  type: ErrorTypeValue;
  code: ErrorCodeType;
  message: string;
  details?: ApiErrorDetails;
}): NextResponse {
  return NextResponse.json(buildErrorBody(config), { status: config.status });
}

/**
 * Returns a validation error NextResponse (App Router).
 * Transforms ZodError issues into { field, message }[] details.
 *
 * @example
 * return sendValidationError(zodError, 'Request body validation failed.')
 */
export function sendValidationError(
  error: { issues: Array<{ path: Array<string | number | symbol>; message: string }> },
  message: string = 'Validation failed'
): NextResponse {
  return NextResponse.json(buildValidationErrorBody(error, message), { status: 400 });
}
