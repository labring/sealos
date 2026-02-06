import { z } from 'zod';
import 'zod-openapi/extend';

/**
 * Error types for high-level error classification (similar to Stripe)
 * Use these to categorize errors at the application level
 */
export const ErrorType = {
  VALIDATION_ERROR: 'validation_error', // Request validation failures (schema, format)
  CLIENT_ERROR: 'client_error', // Client request errors (method not allowed, etc.)
  RESOURCE_ERROR: 'resource_error', // Resource not found, conflicts, etc.
  OPERATION_ERROR: 'operation_error', // Operation/deployment failures
  AUTHENTICATION_ERROR: 'authentication_error', // Auth required or invalid
  AUTHORIZATION_ERROR: 'authorization_error', // Permission denied
  INTERNAL_ERROR: 'internal_error' // Server errors
} as const;

export type ErrorTypeValue = (typeof ErrorType)[keyof typeof ErrorType];

/**
 * Specific error codes for programmatic error handling
 * Use these codes for client-side error classification and internationalization
 */
export const ErrorCode = {
  // Validation errors
  REQUIRED_FIELD_MISSING: 'REQUIRED_FIELD_MISSING',
  INVALID_FORMAT: 'INVALID_FORMAT',
  INVALID_VALUE: 'INVALID_VALUE',
  INVALID_PARAMETER: 'INVALID_PARAMETER',

  // Client errors
  METHOD_NOT_ALLOWED: 'METHOD_NOT_ALLOWED',
  UNSUPPORTED_OPERATION: 'UNSUPPORTED_OPERATION',

  // Resource errors
  NOT_FOUND: 'NOT_FOUND',
  ALREADY_EXISTS: 'ALREADY_EXISTS',
  CONFLICT: 'CONFLICT',

  // Operation errors
  DEPLOYMENT_ROLLOUT_FAILED: 'DEPLOYMENT_ROLLOUT_FAILED',
  SERVICE_CREATE_FAILED: 'SERVICE_CREATE_FAILED',
  POD_STARTUP_FAILED: 'POD_STARTUP_FAILED',
  STATEFULSET_UPDATE_FAILED: 'STATEFULSET_UPDATE_FAILED',
  STORAGE_UPDATE_FAILED: 'STORAGE_UPDATE_FAILED',
  STORAGE_REQUIRES_STATEFULSET: 'STORAGE_REQUIRES_STATEFULSET',
  OPERATION_FAILED: 'OPERATION_FAILED',

  // Authentication errors
  AUTHENTICATION_REQUIRED: 'AUTHENTICATION_REQUIRED',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',

  // Authorization errors
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',

  // Internal errors
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  KUBERNETES_ERROR: 'KUBERNETES_ERROR'
} as const;

export type ErrorCodeType = (typeof ErrorCode)[keyof typeof ErrorCode];

/**
 * Standard error response schema for all API endpoints (Stripe-style)
 *
 * @example Validation error with Zod issues array
 * {
 *   error: {
 *     type: "validation_error",
 *     code: "INVALID_PARAMETER",
 *     message: "Application name path parameter is invalid or missing.",
 *     details: [{ path: ['name'], message: 'Required' }]
 *   }
 * }
 *
 * @example Kubernetes operation error with error message string
 * {
 *   error: {
 *     type: "operation_error",
 *     code: "KUBERNETES_ERROR",
 *     message: "Failed to pause application \"web-api\". The Kubernetes operation encountered an error.",
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
        description:
          'Specific error code for programmatic handling. Use this for client-side error classification and internationalization.',
        example: 'REQUIRED_FIELD_MISSING'
      }),
      message: z.string().openapi({
        description: 'Human-readable error message that can be displayed to users or developers',
        example: 'Required field is missing'
      }),
      details: z.any().optional().openapi({
        description:
          'Additional error context. Usually a simple string (e.g., Kubernetes error message), or an array of validation errors from Zod. Only included when additional information is available.',
        example: 'deployments.apps "web-api" not found'
      })
    })
  })
  .openapi({
    title: 'Error Response',
    description:
      'Standard error response format for all API endpoints. All error responses follow this structure for consistency. Inspired by Stripe API design.'
  });

/**
 * Helper function to create consistent error examples for OpenAPI documentation
 */
export const createErrorExample = (
  type: ErrorTypeValue,
  code: ErrorCodeType | undefined,
  message: string,
  details?: any
) => ({
  error: {
    type,
    ...(code && { code }),
    message,
    ...(details !== undefined && { details })
  }
});
