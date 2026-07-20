import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('uuid', () => ({
  v4: vi.fn(() => 'new-verification-uid')
}));

vi.mock('@/services/backend/db/init', () => ({
  globalPrisma: {
    $transaction: vi.fn(),
    verificationCode: {
      findUnique: vi.fn(),
      updateMany: vi.fn(),
      deleteMany: vi.fn(),
      upsert: vi.fn()
    }
  }
}));

import { globalPrisma } from '@/services/backend/db/init';
import {
  addOrUpdateCode,
  MAX_VERIFICATION_ATTEMPTS,
  VERIFICATION_CODE_TTL_MS,
  verifyAndConsumeCode
} from '@/services/backend/db/verifyCode';

const mockPrisma = globalPrisma as any;
const now = new Date('2026-07-20T08:00:00.000Z');

const verificationRecord = (overrides: Record<string, unknown> = {}) => ({
  uid: 'verification-uid',
  scenario: 'phone_login',
  providerType: 'PHONE',
  providerId: '13800138000',
  code: '123456',
  attemptCount: 0,
  createdAt: new Date(now.getTime() - 21_000),
  expiresAt: new Date(now.getTime() + 5 * 60_000),
  ...overrides
});

describe('verification code', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(now);
    mockPrisma.$transaction.mockImplementation(async (callback: (tx: unknown) => unknown) =>
      callback(mockPrisma)
    );
  });

  it('returns 9 remaining attempts after the first incorrect code', async () => {
    mockPrisma.verificationCode.findUnique.mockResolvedValue(verificationRecord());
    mockPrisma.verificationCode.updateMany.mockResolvedValue({ count: 1 });

    const result = await verifyAndConsumeCode({
      id: '13800138000',
      smsType: 'phone_login',
      code: '000000'
    });

    expect(result).toEqual({ status: 'invalid', remainingAttempts: 9 });
    expect(mockPrisma.verificationCode.updateMany).toHaveBeenCalledWith({
      where: {
        uid: 'verification-uid',
        code: { not: '000000' },
        attemptCount: { lt: MAX_VERIFICATION_ATTEMPTS },
        expiresAt: { gt: now }
      },
      data: { attemptCount: { increment: 1 } }
    });
  });

  it('locks the code on the tenth incorrect attempt', async () => {
    mockPrisma.verificationCode.findUnique.mockResolvedValue(
      verificationRecord({ attemptCount: MAX_VERIFICATION_ATTEMPTS - 1 })
    );
    mockPrisma.verificationCode.updateMany.mockResolvedValue({ count: 1 });

    const result = await verifyAndConsumeCode({
      id: '13800138000',
      smsType: 'phone_login',
      code: '000000'
    });

    expect(result).toEqual({ status: 'locked', retryAfter: 39 });
    expect(mockPrisma.verificationCode.updateMany).toHaveBeenCalledOnce();
  });

  it('rejects an already locked code without another write', async () => {
    mockPrisma.verificationCode.findUnique.mockResolvedValue(
      verificationRecord({ attemptCount: MAX_VERIFICATION_ATTEMPTS })
    );

    const result = await verifyAndConsumeCode({
      id: '13800138000',
      smsType: 'phone_login',
      code: '123456'
    });

    expect(result).toEqual({ status: 'locked', retryAfter: 39 });
    expect(mockPrisma.verificationCode.updateMany).not.toHaveBeenCalled();
    expect(mockPrisma.verificationCode.deleteMany).not.toHaveBeenCalled();
  });

  it('deletes a correct code and returns its verification info', async () => {
    const record = verificationRecord();
    mockPrisma.verificationCode.findUnique.mockResolvedValue(record);
    mockPrisma.verificationCode.deleteMany.mockResolvedValue({ count: 1 });

    const result = await verifyAndConsumeCode({
      id: '13800138000',
      smsType: 'phone_login',
      code: '123456'
    });

    expect(mockPrisma.verificationCode.deleteMany).toHaveBeenCalledWith({
      where: {
        uid: 'verification-uid',
        code: '123456',
        attemptCount: { lt: MAX_VERIFICATION_ATTEMPTS },
        expiresAt: { gt: now }
      }
    });
    expect(result).toEqual({
      status: 'verified',
      smsInfo: {
        uid: 'verification-uid',
        id: '13800138000',
        smsType: 'phone_login',
        code: '123456',
        createdAt: record.createdAt,
        expiresAt: record.expiresAt,
        attemptCount: 0
      }
    });
  });

  it('resets attempts and replaces the old code when resending', async () => {
    mockPrisma.verificationCode.upsert.mockResolvedValue({ uid: 'new-verification-uid' });

    await addOrUpdateCode({
      id: 'user@example.com',
      smsType: 'email_login',
      code: '654321'
    });

    expect(mockPrisma.verificationCode.upsert).toHaveBeenCalledWith({
      where: {
        scenario_providerType_providerId: {
          scenario: 'email_login',
          providerType: 'EMAIL',
          providerId: 'user@example.com'
        }
      },
      create: {
        uid: 'new-verification-uid',
        scenario: 'email_login',
        providerType: 'EMAIL',
        providerId: 'user@example.com',
        code: '654321',
        attemptCount: 0,
        expiresAt: new Date(now.getTime() + VERIFICATION_CODE_TTL_MS),
        createdAt: now
      },
      update: {
        uid: 'new-verification-uid',
        code: '654321',
        attemptCount: 0,
        expiresAt: new Date(now.getTime() + VERIFICATION_CODE_TTL_MS),
        createdAt: now
      }
    });
  });
});
