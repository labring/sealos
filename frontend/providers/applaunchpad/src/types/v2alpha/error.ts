import { z } from 'zod';
import 'zod-openapi/extend';
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
// OpenAPI schemas — local, built with this provider's zod (v3)
// Cannot be shared: zod schemas are zod-version-bound
// ============================================================================

const ValidationFieldIssue = z.object({
  field: z.string().openapi({ example: 'ports[0].number' }),
  message: z.string().openapi({ example: 'Required' })
});

export const ErrorResponseSchema = z
  .object({
    error: z.object({
      type: z.enum(Object.values(ErrorType) as [ErrorTypeValue, ...ErrorTypeValue[]]).openapi({
        description: 'High-level error type for categorization',
        example: 'validation_error'
      }),
      code: z.enum(Object.values(ErrorCode) as [ErrorCodeType, ...ErrorCodeType[]]).openapi({
        description: 'Specific error code for programmatic handling and i18n.',
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
      code: z.enum([ErrorCode.PERMISSION_DENIED, ErrorCode.INSUFFICIENT_BALANCE]).openapi({
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
          ErrorCode.INTERNAL_ERROR
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
