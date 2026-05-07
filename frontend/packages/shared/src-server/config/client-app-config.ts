import { prettyPrintErrors } from './error-formatter';

const SERVER_MISCONFIGURED_MESSAGE = 'Server misconfigured';

type SafeParseSuccess<T> = {
  success: true;
  data: T;
};

type SafeParseFailure = {
  success: false;
  error: Error;
};

type SafeParseResult<T> = SafeParseSuccess<T> | SafeParseFailure;

type SafeParseSchema<T> = {
  safeParse: (input: unknown) => SafeParseResult<T>;
};

export class ServerMisconfiguredError extends Error {
  constructor() {
    super(SERVER_MISCONFIGURED_MESSAGE);
    this.name = 'ServerMisconfiguredError';
  }
}

export function isServerMisconfiguredError(error: unknown): error is ServerMisconfiguredError {
  return error instanceof ServerMisconfiguredError;
}

export function validateClientAppConfigOrThrow<T>(
  schema: SafeParseSchema<T>,
  rawConfig: unknown
): T {
  const result = schema.safeParse(rawConfig);
  if (result.success) {
    return result.data;
  }

  console.error('[Client App Config] Validation failed:');
  console.error(prettyPrintErrors(result.error));
  throw new ServerMisconfiguredError();
}
