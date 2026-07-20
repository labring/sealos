import { createHash } from 'crypto';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/services/backend/requestIp', () => ({
  getClientIp: vi.fn(() => '203.0.113.42')
}));

vi.mock('@/services/backend/db/init', () => ({
  globalPrisma: {
    $transaction: vi.fn(),
    verificationRateLimit: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      deleteMany: vi.fn()
    }
  }
}));

import { globalPrisma } from '@/services/backend/db/init';
import {
  releaseVerificationSend,
  reserveVerificationSend
} from '@/services/backend/db/verificationRateLimit';

const mockPrisma = globalPrisma as any;
const now = new Date('2026-07-20T08:00:00.000Z');
const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');

describe('verification send rate limit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(now);
    mockPrisma.$transaction.mockImplementation(async (callback: (tx: unknown) => unknown) =>
      callback(mockPrisma)
    );
  });

  it('reserves identifier and IP windows without putting plaintext in keys', async () => {
    mockPrisma.verificationRateLimit.findUnique.mockResolvedValue(null);
    mockPrisma.verificationRateLimit.upsert.mockResolvedValue({});

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
    expect(mockPrisma.verificationRateLimit.upsert).toHaveBeenCalledTimes(3);
    expect(
      mockPrisma.verificationRateLimit.upsert.mock.calls.map(([args]: any[]) => args.where.key)
    ).toEqual(expectedKeys);
    for (const key of expectedKeys) {
      expect(key).not.toContain('User@Example.com');
      expect(key).not.toContain('user@example.com');
      expect(key).not.toContain('203.0.113.42');
    }
  });

  it('returns retryAfter when the identifier minute window is full', async () => {
    mockPrisma.verificationRateLimit.findUnique.mockResolvedValue({
      key: 'minute-key',
      count: 1,
      expiresAt: new Date(now.getTime() + 39_000)
    });

    const result = await reserveVerificationSend({} as any, '13800138000', 'PHONE');

    expect(result).toEqual({ allowed: false, retryAfter: 39 });
    expect(mockPrisma.verificationRateLimit.upsert).not.toHaveBeenCalled();
    expect(mockPrisma.verificationRateLimit.update).not.toHaveBeenCalled();
  });

  it('releases all reserved counters without allowing negative values', async () => {
    mockPrisma.verificationRateLimit.updateMany.mockResolvedValue({ count: 3 });
    const reservation = {
      entries: [
        { key: 'verification:id:minute:a', windowStartedAt: now },
        { key: 'verification:id:hour:a', windowStartedAt: now },
        { key: 'verification:ip:ten-minute:b', windowStartedAt: now }
      ]
    };

    await releaseVerificationSend(reservation);

    expect(mockPrisma.verificationRateLimit.updateMany).toHaveBeenCalledWith({
      where: {
        OR: reservation.entries.map(({ key, windowStartedAt }) => ({
          key,
          windowStartedAt,
          count: { gt: 0 }
        }))
      },
      data: { count: { decrement: 1 } }
    });
  });
});
