import { beforeEach, describe, expect, it, vi } from 'vitest';

const collection = {
  createIndex: vi.fn(),
  updateOne: vi.fn(),
  findOne: vi.fn(),
  findOneAndDelete: vi.fn(),
  findOneAndUpdate: vi.fn(),
  deleteOne: vi.fn()
};

vi.mock('@/services/backend/db/mongodb', () => ({
  connectToDatabase: vi.fn(async () => ({
    db: () => ({ collection: () => collection })
  }))
}));

vi.mock('uuid', () => ({ v4: vi.fn() }));

import { v4 } from 'uuid';
import {
  addOrUpdateCode,
  MAX_VERIFICATION_ATTEMPTS,
  verifyAndConsumeCode
} from '@/services/backend/db/verifyCode';

const now = new Date('2026-07-20T08:00:00.000Z');
const challengeId = '00000000-0000-4000-8000-000000000002';
const record = (overrides: Record<string, unknown> = {}) => ({
  uid: '00000000-0000-4000-8000-000000000001',
  challengeId,
  id: '13800138000',
  smsType: 'phone_login',
  code: '123456',
  attemptCount: 0,
  createdAt: new Date(now.getTime() - 21_000),
  ...overrides
});

describe('Mongo verification code', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(now);
    collection.createIndex.mockResolvedValue('index');
  });

  it('atomically increments an incorrect attempt and returns the remaining count', async () => {
    collection.findOneAndDelete.mockResolvedValue({ value: null });
    collection.findOneAndUpdate.mockResolvedValue({ value: record({ attemptCount: 1 }) });

    await expect(
      verifyAndConsumeCode({
        id: '13800138000',
        smsType: 'phone_login',
        code: '000000',
        challengeId
      })
    ).resolves.toEqual({ status: 'invalid', remainingAttempts: 9 });

    expect(collection.findOneAndUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        id: '13800138000',
        smsType: 'phone_login',
        challengeId,
        code: { $ne: '000000' },
        $or: [
          { attemptCount: { $lt: MAX_VERIFICATION_ATTEMPTS } },
          { attemptCount: { $exists: false } }
        ]
      }),
      { $inc: { attemptCount: 1 } },
      { returnDocument: 'after' }
    );
  });

  it('logically invalidates the code on the tenth failed attempt', async () => {
    collection.findOneAndDelete.mockResolvedValue({ value: null });
    collection.findOneAndUpdate.mockResolvedValue({
      value: record({ attemptCount: MAX_VERIFICATION_ATTEMPTS })
    });

    await expect(
      verifyAndConsumeCode({
        id: '13800138000',
        smsType: 'phone_login',
        code: '000000',
        challengeId
      })
    ).resolves.toEqual({ status: 'locked', retryAfter: 39 });
  });

  it('allows at most ten increments under concurrent incorrect attempts', async () => {
    let attemptCount = 0;
    collection.findOneAndDelete.mockResolvedValue({ value: null });
    collection.findOneAndUpdate.mockImplementation(async () => {
      if (attemptCount >= MAX_VERIFICATION_ATTEMPTS) return { value: null };
      attemptCount += 1;
      return { value: record({ attemptCount }) };
    });
    collection.findOne.mockImplementation(async () => record({ attemptCount }));

    const results = await Promise.all(
      Array.from({ length: 20 }, () =>
        verifyAndConsumeCode({
          id: '13800138000',
          smsType: 'phone_login',
          code: '000000',
          challengeId
        })
      )
    );

    expect(attemptCount).toBe(MAX_VERIFICATION_ATTEMPTS);
    expect(results.filter((result) => result.status === 'invalid')).toHaveLength(9);
    expect(results.filter((result) => result.status === 'locked')).toHaveLength(11);
  });

  it('returns a stable lock response after attempts are exhausted', async () => {
    collection.findOneAndDelete.mockResolvedValue({ value: null });
    collection.findOneAndUpdate.mockResolvedValue({ value: null });
    collection.findOne.mockResolvedValue(record({ attemptCount: MAX_VERIFICATION_ATTEMPTS }));

    await expect(
      verifyAndConsumeCode({
        id: '13800138000',
        smsType: 'phone_login',
        code: '123456',
        challengeId
      })
    ).resolves.toEqual({ status: 'locked', retryAfter: 39 });
  });

  it('atomically consumes a correct code once', async () => {
    collection.findOneAndDelete
      .mockResolvedValueOnce({ value: record() })
      .mockResolvedValueOnce({ value: null });
    collection.findOneAndUpdate.mockResolvedValue({ value: null });
    collection.findOne.mockResolvedValue(null);

    const params = {
      id: '13800138000',
      smsType: 'phone_login' as const,
      code: '123456',
      challengeId
    };
    const [first, second] = await Promise.all([
      verifyAndConsumeCode(params),
      verifyAndConsumeCode(params)
    ]);

    expect([first.status, second.status].sort()).toEqual(['expired', 'verified']);
  });

  it('does not let an old challenge affect a replacement code', async () => {
    collection.findOneAndDelete.mockResolvedValue({ value: null });
    collection.findOneAndUpdate.mockResolvedValue({ value: null });
    collection.findOne.mockResolvedValue(null);

    await expect(
      verifyAndConsumeCode({
        id: '13800138000',
        smsType: 'phone_login',
        code: '000000',
        challengeId: '00000000-0000-4000-8000-000000000099'
      })
    ).resolves.toEqual({ status: 'expired' });
    expect(collection.findOneAndUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        challengeId: '00000000-0000-4000-8000-000000000099'
      }),
      expect.anything(),
      expect.anything()
    );
  });

  it('resets attempts and rotates both internal and public IDs when resending', async () => {
    vi.mocked(v4)
      .mockReturnValueOnce('00000000-0000-4000-8000-000000000010')
      .mockReturnValueOnce('00000000-0000-4000-8000-000000000011');
    collection.updateOne.mockResolvedValue({ acknowledged: true });

    await expect(
      addOrUpdateCode({
        id: 'user@example.com',
        smsType: 'email_login',
        code: '654321'
      })
    ).resolves.toEqual({
      uid: '00000000-0000-4000-8000-000000000010',
      challengeId: '00000000-0000-4000-8000-000000000011'
    });
    expect(collection.updateOne).toHaveBeenCalledWith(
      { id: 'user@example.com', smsType: 'email_login' },
      {
        $set: expect.objectContaining({
          code: '654321',
          attemptCount: 0,
          uid: '00000000-0000-4000-8000-000000000010',
          challengeId: '00000000-0000-4000-8000-000000000011'
        })
      },
      { upsert: true }
    );
  });
});
