import { z } from 'zod';
import 'zod-openapi/extend';
import { NextApiResponse } from 'next';
import {
  ErrorType,
  ErrorCode,
  buildErrorBody,
  buildValidationErrorBody
} from '@labring/sealos-shared-sdk/server/v2alpha';

export { ErrorType, ErrorCode, buildErrorBody, buildValidationErrorBody };
export type {
  ErrorTypeValue,
  ErrorCodeType,
  ApiErrorResponse,
  ApiErrorDetails
} from '@labring/sealos-shared-sdk/server/v2alpha';

import type {
  ErrorTypeValue,
  ErrorCodeType,
  ApiErrorDetails
} from '@labring/sealos-shared-sdk/server/v2alpha';

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

// Code → type mapping for 400 (per design doc)
const ERROR_400_CODE_TO_TYPE: Record<string, ErrorTypeValue> = {
  [ErrorCode.INVALID_PARAMETER]: ErrorType.VALIDATION_ERROR,
  [ErrorCode.INVALID_VALUE]: ErrorType.VALIDATION_ERROR,
  [ErrorCode.UNSUPPORTED_OPERATION]: ErrorType.CLIENT_ERROR,
  [ErrorCode.STORAGE_REQUIRES_STATEFULSET]: ErrorType.CLIENT_ERROR
};

/** Permitted 400 codes (for type constraint) */
export type Error400Code =
  | typeof ErrorCode.INVALID_PARAMETER
  | typeof ErrorCode.INVALID_VALUE
  | typeof ErrorCode.UNSUPPORTED_OPERATION
  | typeof ErrorCode.STORAGE_REQUIRES_STATEFULSET;

/**
 * Create a 400 error schema. Each endpoint passes the codes it can return.
 */
export function createError400Schema(
  codes: readonly [Error400Code, ...Error400Code[]],
  titleSuffix?: string
) {
  const uniqueTypes = [...new Set(codes.map((c) => ERROR_400_CODE_TO_TYPE[c]))] as [
    ErrorTypeValue,
    ...ErrorTypeValue[]
  ];
  return z
    .object({
      error: z.object({
        type: z.enum(uniqueTypes).openapi({
          description: 'High-level error type for categorization'
        }),
        code: z.enum(codes as [ErrorCodeType, ...ErrorCodeType[]]).openapi({
          description: 'Specific error code for programmatic handling and i18n'
        }),
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
    .openapi({ title: titleSuffix ? `Error 400 - ${titleSuffix}` : 'Error 400' });
}

/** Create 401 error schema. */
export function createError401Schema(titleSuffix?: string) {
  return z
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
    .openapi({ title: titleSuffix ? `Error 401 - ${titleSuffix}` : 'Error 401' });
}

/** Permitted 403 codes */
export type Error403Code =
  | typeof ErrorCode.PERMISSION_DENIED
  | typeof ErrorCode.INSUFFICIENT_BALANCE;

/**
 * Create a 403 error schema. Each endpoint passes the codes it can return.
 */
export function createError403Schema(
  codes: readonly [Error403Code, ...Error403Code[]],
  titleSuffix?: string
) {
  return z
    .object({
      error: z.object({
        type: z.literal(ErrorType.AUTHORIZATION_ERROR).openapi({
          description: 'High-level error type for categorization'
        }),
        code: z.enum(codes as [ErrorCodeType, ...ErrorCodeType[]]).openapi({
          description: 'Specific error code for programmatic handling and i18n'
        }),
        message: z.string().openapi({ description: 'Human-readable error message' }),
        details: z.string().optional().openapi({
          description: 'Typically omitted. May contain additional context in edge cases.'
        })
      })
    })
    .openapi({ title: titleSuffix ? `Error 403 - ${titleSuffix}` : 'Error 403' });
}

/** Create 404 error schema. */
export function createError404Schema(titleSuffix?: string) {
  return z
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
    .openapi({ title: titleSuffix ? `Error 404 - ${titleSuffix}` : 'Error 404' });
}

/** Create 405 error schema. */
export function createError405Schema(titleSuffix?: string) {
  return z
    .object({
      error: z.object({
        type: z.literal(ErrorType.CLIENT_ERROR).openapi({
          description: 'High-level error type for categorization'
        }),
        code: z.literal(ErrorCode.METHOD_NOT_ALLOWED).openapi({
          description: 'The HTTP method is not supported on this endpoint'
        }),
        message: z.string().openapi({ description: 'Human-readable error message' }),
        details: z.string().optional().openapi({
          description: 'Typically omitted. May list allowed methods.'
        })
      })
    })
    .openapi({ title: titleSuffix ? `Error 405 - ${titleSuffix}` : 'Error 405' });
}

/** Permitted 409 codes */
export type Error409Code = typeof ErrorCode.ALREADY_EXISTS | typeof ErrorCode.CONFLICT;

/**
 * Create a 409 error schema. Each endpoint passes the codes it can return.
 */
/** details for 409: ad-hoc object or string (e.g. CONFLICT port conflict context) */
const DetailsObjectOrString = z
  .union([z.record(z.string(), z.unknown()), z.string()])
  .optional()
  .openapi({
    description:
      'Ad-hoc context. For CONFLICT: object with conflict details (e.g. conflictingPortDetails, operation).'
  });

export function createError409Schema(
  codes: readonly [Error409Code, ...Error409Code[]],
  titleSuffix?: string
) {
  return z
    .object({
      error: z.object({
        type: z.literal(ErrorType.RESOURCE_ERROR).openapi({
          description: 'High-level error type for categorization'
        }),
        code: z.enum(codes as [ErrorCodeType, ...ErrorCodeType[]]).openapi({
          description: 'Specific error code for programmatic handling and i18n'
        }),
        message: z.string().openapi({ description: 'Human-readable error message' }),
        details: DetailsObjectOrString
      })
    })
    .openapi({ title: titleSuffix ? `Error 409 - ${titleSuffix}` : 'Error 409' });
}

/** Create 422 error schema (operation_error / INVALID_RESOURCE_SPEC). */
export function createError422Schema(titleSuffix?: string) {
  return z
    .object({
      error: z.object({
        type: z.literal(ErrorType.OPERATION_ERROR).openapi({
          description: 'High-level error type for categorization'
        }),
        code: z.literal(ErrorCode.INVALID_RESOURCE_SPEC).openapi({
          description:
            'Resource spec rejected by cluster (admission webhook, invalid field, quota exceeded)'
        }),
        message: z.string().openapi({ description: 'Human-readable error message' }),
        details: z.string().optional().openapi({
          description: 'Raw K8s rejection reason from the cluster',
          example: 'admission webhook "vingress.sealos.io" denied the request: cannot verify host'
        })
      })
    })
    .openapi({ title: titleSuffix ? `Error 422 - ${titleSuffix}` : 'Error 422' });
}

const ERROR_500_CODE_TO_TYPE: Record<string, ErrorTypeValue> = {
  [ErrorCode.KUBERNETES_ERROR]: ErrorType.OPERATION_ERROR,
  [ErrorCode.STORAGE_UPDATE_FAILED]: ErrorType.OPERATION_ERROR,
  [ErrorCode.OPERATION_FAILED]: ErrorType.OPERATION_ERROR,
  [ErrorCode.INTERNAL_ERROR]: ErrorType.INTERNAL_ERROR
};

/** Permitted 500 codes */
export type Error500Code =
  | typeof ErrorCode.KUBERNETES_ERROR
  | typeof ErrorCode.STORAGE_UPDATE_FAILED
  | typeof ErrorCode.OPERATION_FAILED
  | typeof ErrorCode.INTERNAL_ERROR;

/**
 * Create a 500 error schema. Each endpoint passes the codes it can return.
 */
export function createError500Schema(
  codes: readonly [Error500Code, ...Error500Code[]],
  titleSuffix?: string
) {
  const uniqueTypes = [...new Set(codes.map((c) => ERROR_500_CODE_TO_TYPE[c]))] as [
    ErrorTypeValue,
    ...ErrorTypeValue[]
  ];
  return z
    .object({
      error: z.object({
        type: z.enum(uniqueTypes).openapi({
          description: 'High-level error type for categorization'
        }),
        code: z.enum(codes as [ErrorCodeType, ...ErrorCodeType[]]).openapi({
          description: 'Specific error code for programmatic handling and i18n'
        }),
        message: z.string().openapi({ description: 'Human-readable error message' }),
        details: z.string().optional().openapi({
          description: 'Raw error string from the underlying system, for troubleshooting.',
          example: 'deployments.apps "web-api" not found'
        })
      })
    })
    .openapi({ title: titleSuffix ? `Error 500 - ${titleSuffix}` : 'Error 500' });
}

/** Create 503 error schema. */
export function createError503Schema(titleSuffix?: string) {
  return z
    .object({
      error: z.object({
        type: z.literal(ErrorType.INTERNAL_ERROR).openapi({
          description: 'High-level error type for categorization'
        }),
        code: z.literal(ErrorCode.SERVICE_UNAVAILABLE).openapi({
          description: 'Kubernetes cluster or required dependency is temporarily unreachable'
        }),
        message: z.string().openapi({ description: 'Human-readable error message' }),
        details: z.string().optional().openapi({
          description: 'Connection error from the underlying system',
          example: 'connect ECONNREFUSED 10.0.0.1:6443'
        })
      })
    })
    .openapi({ title: titleSuffix ? `Error 503 - ${titleSuffix}` : 'Error 503' });
}

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
    details?: ApiErrorDetails;
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
