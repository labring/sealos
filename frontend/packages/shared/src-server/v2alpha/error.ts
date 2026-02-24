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
// Response type — manually defined, no zod dependency
// Keeps this module zod-version-agnostic so it works with any provider
// regardless of whether they use zod v3 or v4.
// ============================================================================

export type ApiErrorResponse = {
  error: {
    type: ErrorTypeValue;
    code: ErrorCodeType;
    message: string;
    details?: Array<{ field: string; message: string }> | string;
  };
};

// ============================================================================
// Framework-agnostic builders
// ============================================================================

/**
 * Build a standard error response body.
 * Framework-agnostic — pass the result to res.json() or NextResponse.json().
 *
 * @example
 * res.status(404).json(buildErrorBody({
 *   type: ErrorType.RESOURCE_ERROR,
 *   code: ErrorCode.NOT_FOUND,
 *   message: 'Application "web-api" not found.'
 * }));
 */
export function buildErrorBody(config: {
  type: ErrorTypeValue;
  code: ErrorCodeType;
  message: string;
  details?: unknown;
}): ApiErrorResponse {
  return {
    error: {
      type: config.type,
      code: config.code,
      message: config.message,
      ...(config.details !== undefined && {
        details: config.details as ApiErrorResponse['error']['details']
      })
    }
  };
}

/**
 * Structural type for ZodError issues — compatible with both zod v3 and v4.
 */
type ZodLikeError = {
  issues: Array<{ path: Array<string | number | symbol>; message: string }>;
};

/**
 * Convert a Zod issue path to dot-notation field string.
 * e.g. ['ports', 0, 'number'] → 'ports[0].number'
 */
function zodPathToField(path: Array<string | number | symbol>): string {
  return path.reduce<string>((acc, segment, i) => {
    if (typeof segment === 'number') return `${acc}[${segment}]`;
    if (typeof segment === 'symbol') return i === 0 ? String(segment) : `${acc}.${String(segment)}`;
    return i === 0 ? segment : `${acc}.${segment}`;
  }, '');
}

/**
 * Build a validation error response body from a ZodError (v3 or v4 compatible).
 * Framework-agnostic — pass the result to res.status(400).json() or NextResponse.json(..., { status: 400 }).
 *
 * @example
 * res.status(400).json(buildValidationErrorBody(zodError, 'Request body validation failed.'));
 */
export function buildValidationErrorBody(
  error: ZodLikeError,
  message: string = 'Validation failed'
): ApiErrorResponse {
  return buildErrorBody({
    type: ErrorType.VALIDATION_ERROR,
    code: ErrorCode.INVALID_PARAMETER,
    message,
    details: error.issues.map((issue) => ({
      field: zodPathToField(issue.path),
      message: issue.message
    }))
  });
}
