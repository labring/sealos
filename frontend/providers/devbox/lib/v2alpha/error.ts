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
  ErrorCodeType,
  ErrorTypeValue
} from '@sealos/shared/server/v2alpha';

import type { ErrorCodeType, ErrorTypeValue } from '@sealos/shared/server/v2alpha';

// ============================================================================
// OpenAPI schemas — local, built with this provider's zod (v3 + zod-openapi v4)
// ============================================================================

export const Error400Schema = z.object({
  error: z.object({
    type: z.enum([ErrorType.VALIDATION_ERROR, ErrorType.CLIENT_ERROR]),
    code: z.enum([
      ErrorCode.INVALID_PARAMETER,
      ErrorCode.INVALID_VALUE,
      ErrorCode.METHOD_NOT_ALLOWED
    ]),
    message: z.string(),
    details: z
      .union([z.array(z.object({ field: z.string(), message: z.string() })), z.string()])
      .optional()
  })
});

export const Error401Schema = z.object({
  error: z.object({
    type: z.literal(ErrorType.AUTHENTICATION_ERROR),
    code: z.literal(ErrorCode.AUTHENTICATION_REQUIRED),
    message: z.string()
  })
});

export const Error403Schema = z.object({
  error: z.object({
    type: z.literal(ErrorType.AUTHORIZATION_ERROR),
    code: z.enum([ErrorCode.PERMISSION_DENIED, ErrorCode.INSUFFICIENT_BALANCE]),
    message: z.string()
  })
});

export const Error404Schema = z.object({
  error: z.object({
    type: z.literal(ErrorType.RESOURCE_ERROR),
    code: z.literal(ErrorCode.NOT_FOUND),
    message: z.string()
  })
});

export const Error409Schema = z.object({
  error: z.object({
    type: z.literal(ErrorType.RESOURCE_ERROR),
    code: z.literal(ErrorCode.ALREADY_EXISTS),
    message: z.string()
  })
});

export const Error422Schema = z.object({
  error: z.object({
    type: z.literal(ErrorType.OPERATION_ERROR),
    code: z.literal(ErrorCode.INVALID_RESOURCE_SPEC),
    message: z.string(),
    details: z.string().optional()
  })
});

export const Error500Schema = z.object({
  error: z.object({
    type: z.enum([ErrorType.OPERATION_ERROR, ErrorType.INTERNAL_ERROR]),
    code: z.enum([
      ErrorCode.OPERATION_FAILED,
      ErrorCode.INTERNAL_ERROR,
      ErrorCode.KUBERNETES_ERROR
    ]),
    message: z.string(),
    details: z.string().optional()
  })
});

export const Error503Schema = z.object({
  error: z.object({
    type: z.literal(ErrorType.INTERNAL_ERROR),
    code: z.literal(ErrorCode.SERVICE_UNAVAILABLE),
    message: z.string(),
    details: z.string().optional()
  })
});

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
  details?: unknown;
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
