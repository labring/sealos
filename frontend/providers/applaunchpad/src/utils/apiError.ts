import { NextApiResponse } from 'next';
import { ErrorType, ErrorCode, ErrorCodeType, ErrorTypeValue } from '@/types/v2alpha/error';
import { ZodError } from 'zod';

/**
 * Standard error response structure (Stripe-style)
 */
export interface ApiErrorResponse {
  error: {
    type: ErrorTypeValue;
    code?: ErrorCodeType;
    message: string;
    details?: any;
  };
}

/**
 * Error configuration object for sendError function
 */
export interface ErrorConfig {
  status: number;
  type: ErrorTypeValue;
  code?: ErrorCodeType;
  message: string;
  details?: any;
}

/**
 * Send a standardized error response (object parameter style)
 *
 * @example
 * sendError(res, {
 *   status: 400,
 *   type: ErrorType.VALIDATION_ERROR,
 *   code: ErrorCode.INVALID_PARAMETER,
 *   message: 'Invalid path parameter',
 *   details: zodError.issues
 * });
 */
export function sendError(res: NextApiResponse, config: ErrorConfig): void {
  const response: ApiErrorResponse = {
    error: {
      type: config.type,
      message: config.message,
      ...(config.code && { code: config.code }),
      ...(config.details !== undefined && { details: config.details })
    }
  };

  res.status(config.status).json(response);
}

// ============================================================================
// Convenience helpers (only the most frequently used)
// ============================================================================

/**
 * Send validation error response from Zod validation
 * Helper for the most common case: Zod schema validation failures
 *
 * @example
 * sendValidationError(res, zodError, 'Invalid path parameter');
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
    details: error.issues
  });
}
