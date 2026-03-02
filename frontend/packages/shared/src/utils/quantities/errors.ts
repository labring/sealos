export type QuantityErrorCode = 'FORMAT_WRONG' | 'NUMERIC' | 'SUFFIX';

/**
 * A discriminated error type for Kubernetes-style quantity parsing.
 *
 * - `FORMAT_WRONG`: the input does not match the quantity grammar.
 * - `NUMERIC`: the numeric part is invalid (NaN, malformed, etc.).
 * - `SUFFIX`: the suffix is not supported or malformed (e.g. invalid exponent suffix).
 */
export class QuantityParseError extends Error {
  readonly code: QuantityErrorCode;
  readonly input: string;

  /**
   * @param code - Error category aligned with k8s Quantity errors.
   * @param input - Original input string (or the relevant part) for debugging.
   * @param message - Optional custom message.
   * @param cause - Optional underlying cause.
   */
  constructor(code: QuantityErrorCode, input: string, message?: string, cause?: unknown) {
    super(message ?? `Failed to parse quantity: ${code}`);
    this.name = 'QuantityParseError';
    this.code = code;
    this.input = input;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (this as any).cause = cause;
  }
}
