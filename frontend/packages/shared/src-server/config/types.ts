import type { ZodError } from 'zod';

/**
 * Result type for successful config parsing.
 */
export type ConfigSuccess<T> = {
  data: T;
  error?: never;
};

/**
 * Result type for failed config parsing.
 */
export type ConfigError = {
  data?: never;
  error: {
    message: string;
    details: ZodError | Error;
  };
};

/**
 * Result type for config parsing operations.
 */
export type ConfigResult<T> = ConfigSuccess<T> | ConfigError;
