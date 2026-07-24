import {
  getPrismaErrorCode,
  getSafeAuthErrorInfo,
  retryAuthDatabaseError,
  retryPrismaTransactionConflict
} from '@/services/backend/authDiagnostics';

describe('auth diagnostics', () => {
  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation();
    jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'warn').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('extracts safe Prisma error fields', () => {
    const error = {
      name: 'PrismaClientKnownRequestError',
      message: 'Transaction failed',
      code: 'P2034',
      clientVersion: '5.10.2',
      meta: {
        modelName: 'UserWorkspace',
        password: 'must-not-be-logged',
        token: 'must-not-be-logged',
        nested: { ignored: true }
      }
    };

    expect(getPrismaErrorCode(error)).toBe('P2034');
    expect(getSafeAuthErrorInfo(error)).toEqual({
      name: 'PrismaClientKnownRequestError',
      message: 'Transaction failed',
      code: 'P2034',
      clientVersion: '5.10.2',
      meta: {
        modelName: 'UserWorkspace'
      }
    });
  });

  it('retries P2034 transaction conflicts', async () => {
    const operation = jest
      .fn()
      .mockRejectedValueOnce({ code: 'P2034', message: 'write conflict' })
      .mockResolvedValueOnce('ok');

    await expect(
      retryPrismaTransactionConflict('test.stage', { userUid: 'user-uid' }, operation)
    ).resolves.toBe('ok');
    expect(operation).toHaveBeenCalledTimes(2);
  });

  it('does not retry non-retryable Prisma errors', async () => {
    const operation = jest.fn().mockRejectedValue({ code: 'P1008', message: 'timeout' });

    await expect(
      retryPrismaTransactionConflict('test.stage', { userUid: 'user-uid' }, operation)
    ).rejects.toMatchObject({ code: 'P1008' });
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it('retries transient auth database timeouts once by default', async () => {
    const operation = jest
      .fn()
      .mockRejectedValueOnce({ code: 'P2024', message: 'pool timeout' })
      .mockResolvedValueOnce('ok');

    await expect(
      retryAuthDatabaseError('test.auth', { provider: 'PASSWORD' }, operation)
    ).resolves.toBe('ok');
    expect(operation).toHaveBeenCalledTimes(2);
  });
});
