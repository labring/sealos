import { z } from 'zod';
import 'zod-openapi/extend';
import { NextApiResponse } from 'next';
import { ZodError, ZodIssue } from 'zod';

// ============================================================================
// Error Type — high-level classification
// ============================================================================

export const ErrorType = {
  VALIDATION_ERROR: 'validation_error', // Request body or path params fail schema/type validation
  CLIENT_ERROR: 'client_error', // Request is valid but the operation is semantically disallowed
  RESOURCE_ERROR: 'resource_error', // Resource not found, already exists, or in conflict
  OPERATION_ERROR: 'operation_error', // Server-side operation failed during execution
  AUTHENTICATION_ERROR: 'authentication_error', // Missing or expired credentials
  AUTHORIZATION_ERROR: 'authorization_error', // Insufficient permissions
  INTERNAL_ERROR: 'internal_error' // Unexpected server exception or dependency failure
} as const;

export type ErrorTypeValue = (typeof ErrorType)[keyof typeof ErrorType];

// ============================================================================
// Error Code — specific code for programmatic handling and i18n
// Each code maps to exactly one ErrorType — see design doc for the full mapping.
// ============================================================================

export const ErrorCode = {
  // validation_error
  INVALID_PARAMETER: 'INVALID_PARAMETER', // Schema/type validation failed; details contains field-level issues
  INVALID_VALUE: 'INVALID_VALUE', // Field value violates a business rule

  // client_error
  METHOD_NOT_ALLOWED: 'METHOD_NOT_ALLOWED',
  UNSUPPORTED_OPERATION: 'UNSUPPORTED_OPERATION',
  STORAGE_REQUIRES_STATEFULSET: 'STORAGE_REQUIRES_STATEFULSET', // Internal: K8s workload constraint

  // resource_error
  NOT_FOUND: 'NOT_FOUND',
  ALREADY_EXISTS: 'ALREADY_EXISTS',
  CONFLICT: 'CONFLICT',

  // operation_error
  KUBERNETES_ERROR: 'KUBERNETES_ERROR', // K8s API call failed; details contains raw error
  STORAGE_UPDATE_FAILED: 'STORAGE_UPDATE_FAILED',
  OPERATION_FAILED: 'OPERATION_FAILED', // Generic fallback

  // authentication_error
  AUTHENTICATION_REQUIRED: 'AUTHENTICATION_REQUIRED',

  // authorization_error
  PERMISSION_DENIED: 'PERMISSION_DENIED',

  // internal_error
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE'
} as const;

export type ErrorCodeType = (typeof ErrorCode)[keyof typeof ErrorCode];

// ============================================================================
// Response schema (Zod + OpenAPI)
// ============================================================================

/**
 * Standard error response schema for all API endpoints (Stripe-style)
 *
 * @example Validation error with field-level details
 * {
 *   error: {
 *     type: "validation_error",
 *     code: "INVALID_PARAMETER",
 *     message: "Request body validation failed.",
 *     details: [{ field: "image.imageName", message: "Required" }]
 *   }
 * }
 *
 * @example Operation error with raw error string
 * {
 *   error: {
 *     type: "operation_error",
 *     code: "KUBERNETES_ERROR",
 *     message: "Failed to pause application \"web-api\".",
 *     details: "deployments.apps \"web-api\" not found"
 *   }
 * }
 *
 * @example Client error without details
 * {
 *   error: {
 *     type: "client_error",
 *     code: "METHOD_NOT_ALLOWED",
 *     message: "HTTP method GET is not supported. Use POST to create an application."
 *   }
 * }
 */
export const ErrorResponseSchema = z
  .object({
    error: z.object({
      type: z.enum(Object.values(ErrorType) as [ErrorTypeValue, ...ErrorTypeValue[]]).openapi({
        description: 'High-level error type for categorization',
        example: 'validation_error'
      }),
      code: z.enum(Object.values(ErrorCode) as [ErrorCodeType, ...ErrorCodeType[]]).openapi({
        description: 'Specific error code for programmatic handling and i18n. Always present.',
        example: 'INVALID_PARAMETER'
      }),
      message: z.string().openapi({
        description: 'Human-readable error message',
        example: 'Request body validation failed.'
      }),
      details: z
        .union([z.array(z.object({ field: z.string(), message: z.string() })), z.string()])
        .optional()
        .openapi({
          description:
            'Extra context. For INVALID_PARAMETER: Array<{ field: string, message: string }>. For operation/internal errors: raw error string. Omitted for other codes.',
          example: [{ field: 'image.imageName', message: 'Required' }]
        })
    })
  })
  .openapi({
    title: 'Error Response',
    description:
      'Standard error response format for all API endpoints. Inspired by Stripe API design.'
  });

export type ApiErrorResponse = z.infer<typeof ErrorResponseSchema>;

// ============================================================================
// Server helpers
// ============================================================================

/**
 * Send a standardized error response.
 *
 * @example
 * sendError(res, {
 *   status: 404,
 *   type: ErrorType.RESOURCE_ERROR,
 *   code: ErrorCode.NOT_FOUND,
 *   message: 'Application "web-api" not found.'
 * });
 */
export function sendError(
  res: NextApiResponse,
  config: {
    status: number;
    type: ErrorTypeValue;
    code: ErrorCodeType;
    message: string;
    details?: any;
  }
): void {
  const response: ApiErrorResponse = {
    error: {
      type: config.type,
      code: config.code,
      message: config.message,
      ...(config.details !== undefined && { details: config.details })
    }
  };
  res.status(config.status).json(response);
}

/**
 * Convert a Zod issue path to dot-notation field string.
 * e.g. ['ports', 0, 'number'] → 'ports[0].number'
 */
function zodPathToField(path: ZodIssue['path']): string {
  return path.reduce<string>((acc, segment, i) => {
    if (typeof segment === 'number') return `${acc}[${segment}]`;
    return i === 0 ? segment : `${acc}.${segment}`;
  }, '');
}

/**
 * Send a validation error response.
 * Transforms validation issues into { field, message }[] format per API contract.
 *
 * @example
 * sendValidationError(res, zodError, 'Request body validation failed.');
 */
export function sendValidationError(
  res: NextApiResponse,
  error: ZodError,
  message: string = 'Validation failed'
): void {
  sendError(res, {
    status: 400,
    type: ErrorType.VALIDATION_ERROR,
    code: ErrorCode.INVALID_PARAMETER,
    message,
    details: error.issues.map((issue) => ({
      field: zodPathToField(issue.path),
      message: issue.message
    }))
  });
}

// ============================================================================
// Per-status-code schemas for OpenAPI documentation
// Each schema narrows type/code to only the values permitted by that HTTP status.
// See docs/v2alpha-error-api-design.md § "Status Code → type / code Constraints"
// ============================================================================

const ValidationFieldIssue = z.object({
  field: z.string().openapi({ example: 'ports[0].number' }),
  message: z.string().openapi({ example: 'Required' })
});

export const Error400Schema = z
  .object({
    error: z.object({
      type: z.enum([ErrorType.VALIDATION_ERROR, ErrorType.CLIENT_ERROR]).openapi({
        description: 'High-level error type for categorization'
      }),
      code: z
        .enum([
          ErrorCode.INVALID_PARAMETER,
          ErrorCode.INVALID_VALUE,
          ErrorCode.UNSUPPORTED_OPERATION,
          ErrorCode.STORAGE_REQUIRES_STATEFULSET
        ])
        .openapi({ description: 'Specific error code for programmatic handling and i18n' }),
      message: z.string().openapi({ description: 'Human-readable error message' }),
      details: z
        .union([z.array(ValidationFieldIssue), z.string()])
        .optional()
        .openapi({
          description:
            'For INVALID_PARAMETER: Array<{ field: string, message: string }>. For INVALID_VALUE: optional string. Omitted for other codes.',
          example: [{ field: 'image.imageName', message: 'Required' }]
        })
    })
  })
  .openapi({ title: 'Error 400' });

export const Error401Schema = z
  .object({
    error: z.object({
      type: z.literal(ErrorType.AUTHENTICATION_ERROR).openapi({
        description: 'High-level error type for categorization'
      }),
      code: z.literal(ErrorCode.AUTHENTICATION_REQUIRED).openapi({
        description: 'Specific error code for programmatic handling and i18n'
      }),
      message: z.string().openapi({ description: 'Human-readable error message' }),
      details: z.string().optional().openapi({
        description: 'Typically omitted. May contain additional context in edge cases.'
      })
    })
  })
  .openapi({ title: 'Error 401' });

export const Error403Schema = z
  .object({
    error: z.object({
      type: z.literal(ErrorType.AUTHORIZATION_ERROR).openapi({
        description: 'High-level error type for categorization'
      }),
      code: z.literal(ErrorCode.PERMISSION_DENIED).openapi({
        description: 'Specific error code for programmatic handling and i18n'
      }),
      message: z.string().openapi({ description: 'Human-readable error message' }),
      details: z.string().optional().openapi({
        description: 'Typically omitted. May contain additional context in edge cases.'
      })
    })
  })
  .openapi({ title: 'Error 403' });

export const Error404Schema = z
  .object({
    error: z.object({
      type: z.literal(ErrorType.RESOURCE_ERROR).openapi({
        description: 'High-level error type for categorization'
      }),
      code: z.literal(ErrorCode.NOT_FOUND).openapi({
        description: 'Specific error code for programmatic handling and i18n'
      }),
      message: z.string().openapi({ description: 'Human-readable error message' }),
      details: z.string().optional().openapi({
        description: 'Typically omitted. May contain additional context in edge cases.'
      })
    })
  })
  .openapi({ title: 'Error 404' });

export const Error409Schema = z
  .object({
    error: z.object({
      type: z.literal(ErrorType.RESOURCE_ERROR).openapi({
        description: 'High-level error type for categorization'
      }),
      code: z.enum([ErrorCode.ALREADY_EXISTS, ErrorCode.CONFLICT]).openapi({
        description: 'Specific error code for programmatic handling and i18n'
      }),
      message: z.string().openapi({ description: 'Human-readable error message' }),
      details: z.string().optional().openapi({
        description: 'Typically omitted. May contain additional context in edge cases.'
      })
    })
  })
  .openapi({ title: 'Error 409' });

export const Error500Schema = z
  .object({
    error: z.object({
      type: z.enum([ErrorType.OPERATION_ERROR, ErrorType.INTERNAL_ERROR]).openapi({
        description: 'High-level error type for categorization'
      }),
      code: z
        .enum([
          ErrorCode.KUBERNETES_ERROR,
          ErrorCode.STORAGE_UPDATE_FAILED,
          ErrorCode.OPERATION_FAILED,
          ErrorCode.INTERNAL_ERROR,
          ErrorCode.SERVICE_UNAVAILABLE
        ])
        .openapi({ description: 'Specific error code for programmatic handling and i18n' }),
      message: z.string().openapi({ description: 'Human-readable error message' }),
      details: z.string().optional().openapi({
        description: 'Raw error string from the underlying system, for troubleshooting.',
        example: 'deployments.apps "web-api" not found'
      })
    })
  })
  .openapi({ title: 'Error 500' });

/**
 * Helper to create consistent error examples for OpenAPI documentation.
 */
export const createErrorExample = (
  type: ErrorTypeValue,
  code: ErrorCodeType,
  message: string,
  details?: any
) => ({
  error: {
    type,
    code,
    message,
    ...(details !== undefined && { details })
  }
});
