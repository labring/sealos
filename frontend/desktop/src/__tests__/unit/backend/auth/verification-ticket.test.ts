import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/services/backend/db/init', () => ({
  globalPrisma: {
    $transaction: vi.fn(),
    verificationFlowTicket: {
      create: vi.fn(),
      findFirst: vi.fn(),
      deleteMany: vi.fn()
    }
  }
}));

import { globalPrisma } from '@/services/backend/db/init';
import {
  consumeVerificationFlowTicket,
  createVerificationFlowTicket,
  getVerificationFlowTicket
} from '@/services/backend/db/verificationTicket';

const mockPrisma = globalPrisma as any;

describe('verification flow ticket', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-20T08:00:00.000Z'));
    mockPrisma.$transaction.mockImplementation(async (callback: (tx: unknown) => unknown) =>
      callback(mockPrisma)
    );
  });

  it('replaces an existing ticket for the same user and provider', async () => {
    mockPrisma.verificationFlowTicket.deleteMany.mockResolvedValue({ count: 1 });
    mockPrisma.verificationFlowTicket.create.mockResolvedValue({ uid: 'ticket-uid' });

    await createVerificationFlowTicket({
      uid: 'ticket-uid',
      userUid: '00000000-0000-0000-0000-000000000001',
      providerType: 'PHONE',
      oldProviderId: '13800138000',
      scenario: 'change_binding'
    });

    expect(mockPrisma.verificationFlowTicket.deleteMany).toHaveBeenCalledWith({
      where: {
        userUid: '00000000-0000-0000-0000-000000000001',
        providerType: 'PHONE',
        scenario: 'change_binding'
      }
    });
  });

  it('requires the ticket, user, and provider to match when reading and consuming', async () => {
    mockPrisma.verificationFlowTicket.findFirst.mockResolvedValue(null);
    mockPrisma.verificationFlowTicket.deleteMany.mockResolvedValue({ count: 0 });
    const params = {
      uid: 'ticket-uid',
      userUid: '00000000-0000-0000-0000-000000000002',
      providerType: 'EMAIL',
      scenario: 'change_binding'
    };

    await expect(getVerificationFlowTicket(params)).resolves.toBeNull();
    await expect(consumeVerificationFlowTicket(params)).resolves.toBe(false);

    for (const call of [
      mockPrisma.verificationFlowTicket.findFirst.mock.calls[0][0],
      mockPrisma.verificationFlowTicket.deleteMany.mock.calls[0][0]
    ]) {
      expect(call.where).toMatchObject(params);
      expect(call.where.expiresAt.gt).toBeInstanceOf(Date);
    }
  });
});
