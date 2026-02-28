import { NextResponse } from 'next/server'
import { z } from 'zod'

import {
  buildErrorBody,
  buildValidationErrorBody,
  ErrorCode,
  ErrorType,
} from '@sealos/shared/server/v2alpha'

export { buildErrorBody, buildValidationErrorBody, ErrorCode, ErrorType }
export type { ApiErrorResponse, ErrorCodeType, ErrorTypeValue } from '@sealos/shared/server/v2alpha'

import type { ErrorCodeType, ErrorTypeValue } from '@sealos/shared/server/v2alpha'

// ============================================================================
// OpenAPI schemas — local, built with this provider's zod (v3)
// ============================================================================

/** 400 — aiproxy 只触发 INVALID_PARAMETER */
export function createError400Schema() {
  return z.object({
    error: z.object({
      type: z.literal(ErrorType.VALIDATION_ERROR),
      code: z.literal(ErrorCode.INVALID_PARAMETER),
      message: z.string(),
      details: z
        .union([z.array(z.object({ field: z.string(), message: z.string() })), z.string()])
        .optional(),
    }),
  })
}

/** 401 */
export function createError401Schema() {
  return z.object({
    error: z.object({
      type: z.literal(ErrorType.AUTHENTICATION_ERROR),
      code: z.literal(ErrorCode.AUTHENTICATION_REQUIRED),
      message: z.string(),
      details: z.string().optional(),
    }),
  })
}

/** 404 */
export function createError404Schema() {
  return z.object({
    error: z.object({
      type: z.literal(ErrorType.RESOURCE_ERROR),
      code: z.literal(ErrorCode.NOT_FOUND),
      message: z.string(),
    }),
  })
}

/** 409 — aiproxy 只触发 ALREADY_EXISTS */
export function createError409Schema() {
  return z.object({
    error: z.object({
      type: z.literal(ErrorType.RESOURCE_ERROR),
      code: z.literal(ErrorCode.ALREADY_EXISTS),
      message: z.string(),
    }),
  })
}

/** 500 — aiproxy 只触发 INTERNAL_ERROR */
export function createError500Schema() {
  return z.object({
    error: z.object({
      type: z.literal(ErrorType.INTERNAL_ERROR),
      code: z.literal(ErrorCode.INTERNAL_ERROR),
      message: z.string(),
      details: z.string().optional(),
    }),
  })
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
 *   message: 'Token not found.'
 * })
 */
export function sendError(config: {
  status: number
  type: ErrorTypeValue
  code: ErrorCodeType
  message: string
  details?: unknown
}): NextResponse {
  return NextResponse.json(buildErrorBody(config), { status: config.status })
}

function createErrorExample(
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
      ...(details !== undefined && { details }),
    },
  }
}

export { createErrorExample }

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
  return NextResponse.json(buildValidationErrorBody(error, message), { status: 400 })
}
