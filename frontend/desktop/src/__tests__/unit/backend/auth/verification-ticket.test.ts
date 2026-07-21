import { beforeEach, describe, expect, it, vi } from 'vitest';

const collection = {
  createIndex: vi.fn(),
  findOneAndUpdate: vi.fn(),
  findOne: vi.fn(),
  findOneAndDelete: vi.fn()
};

vi.mock('@/services/backend/db/mongodb', () => ({
  connectToDatabase: vi.fn(async () => ({
    db: () => ({ collection: () => collection })
  }))
}));

import {
  consumeVerificationFlowTicket,
  createVerificationFlowTicket,
  getVerificationFlowTicket
} from '@/services/backend/db/verificationTicket';

const now = new Date('2026-07-20T08:00:00.000Z');
const params = {
  uid: '00000000-0000-4000-8000-000000000001',
  userUid: '00000000-0000-4000-8000-000000000002',
  providerType: 'PHONE',
  oldProviderId: '13800138000',
  scenario: 'change_binding'
};

describe('Mongo verification flow ticket', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(now);
    collection.createIndex.mockResolvedValue('index');
  });

  it('atomically replaces the ticket for the same user and provider', async () => {
    collection.findOneAndUpdate.mockResolvedValue({ value: params });

    await createVerificationFlowTicket(params);

    expect(collection.findOneAndUpdate).toHaveBeenCalledWith(
      {
        userUid: params.userUid,
        providerType: 'PHONE',
        scenario: 'change_binding'
      },
      {
        $set: {
          ...params,
          expiresAt: new Date(now.getTime() + 5 * 60_000)
        }
      },
      { upsert: true, returnDocument: 'after' }
    );
  });

  it('binds reads to the ticket, user, provider, scenario, and expiration', async () => {
    collection.findOne.mockResolvedValue(null);
    const selector = {
      uid: params.uid,
      userUid: params.userUid,
      providerType: params.providerType,
      scenario: params.scenario
    };

    await expect(getVerificationFlowTicket(selector)).resolves.toBeNull();
    expect(collection.findOne).toHaveBeenCalledWith({
      ...selector,
      expiresAt: { $gt: now }
    });
  });

  it('atomically consumes a valid ticket once', async () => {
    collection.findOneAndDelete
      .mockResolvedValueOnce({ value: params })
      .mockResolvedValueOnce({ value: null });
    const selector = {
      uid: params.uid,
      userUid: params.userUid,
      providerType: params.providerType,
      scenario: params.scenario
    };

    await expect(consumeVerificationFlowTicket(selector)).resolves.toBe(true);
    await expect(consumeVerificationFlowTicket(selector)).resolves.toBe(false);
  });
});
