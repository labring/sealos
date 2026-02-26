/**
 * v2alpha error handling — follow docs/v2alpha-api-error-design.md
 * - INVALID_PARAMETER: details must be Array<{ field, message }>
 * - INVALID_VALUE: details is optional string
 * - Use sendError / sendValidationError for Pages Router
 */
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
  field: z.string().describe('Field path using dot/bracket notation, e.g. "ports[0].number"'),
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

export const Error422Schema = z.object({
  error: z.object({
    type: z.literal(ErrorType.OPERATION_ERROR).describe('High-level error type for categorization'),
    code: z
      .literal(ErrorCode.INVALID_RESOURCE_SPEC)
      .describe('Specific error code for programmatic handling and i18n'),
    message: z.string().describe('Human-readable error message'),
    details: z
      .string()
      .optional()
      .describe(
        'Raw K8s rejection reason (admission webhook message, invalid field error, quota exceeded message).'
      )
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
      .describe('Raw connection error from the underlying system (e.g. ECONNREFUSED).')
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
 *   message: 'Template "perplexica" not found.'
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
  res.status(config.status).json(buildErrorBody(config));
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
