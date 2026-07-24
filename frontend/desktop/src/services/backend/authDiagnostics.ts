type AuthDiagnosticContext = Record<string, string | number | boolean | null | undefined>;

const RETRYABLE_PRISMA_CODES = new Set(['P2034']);
const TRANSIENT_AUTH_PRISMA_CODES = new Set(['P1008', 'P2024', 'P2034']);
const SENSITIVE_ERROR_META_KEY_PATTERN = /password|token|secret|authorization|cookie|code/i;

export const getPrismaErrorCode = (error: unknown) => {
  if (!error || typeof error !== 'object') return null;
  const code = (error as { code?: unknown }).code;
  return typeof code === 'string' ? code : null;
};

export const isRetryablePrismaError = (error: unknown) => {
  const code = getPrismaErrorCode(error);
  return !!code && RETRYABLE_PRISMA_CODES.has(code);
};

export const isTransientAuthPrismaError = (error: unknown) => {
  const code = getPrismaErrorCode(error);
  return !!code && TRANSIENT_AUTH_PRISMA_CODES.has(code);
};

export const getSafeAuthErrorInfo = (error: unknown) => {
  if (!error || typeof error !== 'object') {
    return {
      name: typeof error,
      message: String(error)
    };
  }

  const err = error as {
    name?: unknown;
    message?: unknown;
    code?: unknown;
    clientVersion?: unknown;
    meta?: unknown;
  };
  const meta =
    err.meta && typeof err.meta === 'object'
      ? Object.fromEntries(
          Object.entries(err.meta as Record<string, unknown>).filter(([key, value]) => {
            if (SENSITIVE_ERROR_META_KEY_PATTERN.test(key)) return false;
            return (
              typeof value === 'string' ||
              typeof value === 'number' ||
              typeof value === 'boolean' ||
              value === null
            );
          })
        )
      : undefined;

  return {
    name: typeof err.name === 'string' ? err.name : 'Error',
    message: typeof err.message === 'string' ? err.message : undefined,
    code: typeof err.code === 'string' ? err.code : undefined,
    clientVersion: typeof err.clientVersion === 'string' ? err.clientVersion : undefined,
    meta
  };
};

export async function withAuthStage<T>(
  stage: string,
  context: AuthDiagnosticContext,
  operation: () => Promise<T>
) {
  const startedAt = Date.now();
  try {
    const result = await operation();
    console.log('[auth-stage]', {
      stage,
      status: 'success',
      durationMs: Date.now() - startedAt,
      ...context
    });
    return result;
  } catch (error) {
    console.error('[auth-stage]', {
      stage,
      status: 'error',
      durationMs: Date.now() - startedAt,
      ...context,
      error: getSafeAuthErrorInfo(error)
    });
    throw error;
  }
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function retryPrismaTransactionConflict<T>(
  stage: string,
  context: AuthDiagnosticContext,
  operation: () => Promise<T>,
  maxAttempts = 3
) {
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await withAuthStage(stage, { ...context, attempt }, operation);
    } catch (error) {
      lastError = error;
      if (!isRetryablePrismaError(error) || attempt >= maxAttempts) {
        throw error;
      }
      const delayMs = attempt * 100;
      console.warn('[auth-stage]', {
        stage,
        status: 'retry',
        attempt,
        nextAttempt: attempt + 1,
        delayMs,
        ...context,
        error: getSafeAuthErrorInfo(error)
      });
      await wait(delayMs);
    }
  }

  throw lastError;
}

export async function retryAuthDatabaseError<T>(
  stage: string,
  context: AuthDiagnosticContext,
  operation: () => Promise<T>,
  maxAttempts = 2
) {
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await withAuthStage(stage, { ...context, attempt }, operation);
    } catch (error) {
      lastError = error;
      if (!isTransientAuthPrismaError(error) || attempt >= maxAttempts) {
        throw error;
      }
      const delayMs = attempt * 100;
      console.warn('[auth-stage]', {
        stage,
        status: 'retry',
        attempt,
        nextAttempt: attempt + 1,
        delayMs,
        ...context,
        error: getSafeAuthErrorInfo(error)
      });
      await wait(delayMs);
    }
  }

  throw lastError;
}
