import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/services/backend/db/init', () => ({
  globalPrisma: {
    $transaction: vi.fn()
  }
}));

import { globalPrisma } from '@/services/backend/db/init';
import { withSerializableTransaction } from '@/services/backend/db/transaction';

const mockTransaction = vi.mocked(globalPrisma.$transaction);

describe('verification database transaction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('retries P2034 errors from either generated Prisma client', async () => {
    mockTransaction
      .mockRejectedValueOnce({ code: 'P2034' })
      .mockRejectedValueOnce({ code: 'P2034' })
      .mockResolvedValueOnce('verified' as never);

    await expect(withSerializableTransaction(async () => 'verified')).resolves.toBe('verified');
    expect(mockTransaction).toHaveBeenCalledTimes(3);
  });

  it('does not retry unrelated errors', async () => {
    const error = new Error('database unavailable');
    mockTransaction.mockRejectedValueOnce(error);

    await expect(withSerializableTransaction(async () => 'verified')).rejects.toBe(error);
    expect(mockTransaction).toHaveBeenCalledOnce();
  });
});
