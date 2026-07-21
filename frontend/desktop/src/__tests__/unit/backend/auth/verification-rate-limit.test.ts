import { createHash } from 'crypto';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const collection = {
  createIndex: vi.fn(),
  findOne: vi.fn(),
  findOneAndUpdate: vi.fn(),
  updateOne: vi.fn()
};

vi.mock('@/services/backend/requestIp', () => ({
  getClientIp: vi.fn(() => '203.0.113.42')
}));

vi.mock('@/services/backend/db/mongodb', () => ({
  connectToDatabase: vi.fn(async () => ({
    db: () => ({ collection: () => collection })
  }))
}));

import {
  releaseVerificationSend,
  reserveVerificationSend
} from '@/services/backend/db/verificationRateLimit';

const now = new Date('2026-07-20T08:00:00.000Z');
const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');

describe('Mongo verification send rate limit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(now);
    collection.createIndex.mockResolvedValue('index');
    collection.updateOne.mockResolvedValue({ acknowledged: true });
  });

  it('atomically reserves identifier and IP windows without plaintext keys', async () => {
    collection.findOne.mockResolvedValue(null);
    collection.findOneAndUpdate.mockImplementation(async (filter: { key: string }) => ({
      value: { key: filter.key, windowStartedAt: now }
    }));

    const result = await reserveVerificationSend({} as any, ' User@Example.com ', 'EMAIL');

    const identifierHash = sha256('EMAIL:user@example.com');
    const ipHash = sha256('203.0.113.42');
    const expectedKeys = [
      `verification:id:minute:${identifierHash}`,
      `verification:id:hour:${identifierHash}`,
      `verification:ip:ten-minute:${ipHash}`
    ];
    expect(result).toEqual({
      allowed: true,
      reservation: {
        entries: expectedKeys.map((key) => ({ key, windowStartedAt: now }))
      }
    });
    for (const key of expectedKeys) {
      expect(key).not.toContain('user@example.com');
      expect(key).not.toContain('203.0.113.42');
    }
  });

  it('returns retryAfter when the identifier minute window is full', async () => {
    collection.findOne.mockResolvedValue({
      key: 'minute-key',
      count: 1,
      windowStartedAt: new Date(now.getTime() - 21_000),
      expiresAt: new Date(now.getTime() + 39_000)
    });

    await expect(reserveVerificationSend({} as any, '13800138000', 'PHONE')).resolves.toEqual({
      allowed: false,
      retryAfter: 39
    });
    expect(collection.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it('compensates earlier reservations when a later rule is full', async () => {
    collection.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce({
      key: 'hour-key',
      count: 5,
      windowStartedAt: now,
      expiresAt: new Date(now.getTime() + 120_000)
    });
    collection.findOneAndUpdate.mockImplementation(async (filter: { key: string }) => ({
      value: { key: filter.key, windowStartedAt: now }
    }));

    await expect(reserveVerificationSend({} as any, '13800138000', 'PHONE')).resolves.toEqual({
      allowed: false,
      retryAfter: 120
    });
    expect(collection.updateOne).toHaveBeenCalledOnce();
  });

  it('releases each reserved counter only within the matching window', async () => {
    const reservation = {
      entries: [
        { key: 'verification:id:minute:a', windowStartedAt: now },
        { key: 'verification:id:hour:a', windowStartedAt: now },
        { key: 'verification:ip:ten-minute:b', windowStartedAt: now }
      ]
    };

    await releaseVerificationSend(reservation);

    expect(collection.updateOne).toHaveBeenCalledTimes(3);
    expect(collection.updateOne).toHaveBeenCalledWith(
      {
        key: reservation.entries[0].key,
        windowStartedAt: now,
        count: { $gt: 0 }
      },
      { $inc: { count: -1 } }
    );
  });
});
