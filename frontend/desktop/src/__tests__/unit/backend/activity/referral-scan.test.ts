import { beforeEach, describe, expect, it, vi } from 'vitest';

const { query, claim } = vi.hoisted(() => ({ query: vi.fn(), claim: vi.fn() }));
vi.mock('@/services/backend/db/init', () => ({
  globalPrisma: { $queryRaw: query, registrationReferral: { updateMany: claim } }
}));
import { takeMissingReferralRewards } from '@/services/backend/activity/referral-scan';

describe('durable referral scan claims', () => {
  const rows = [
    { id: 'first', inviteeUid: 'a', rewardCheckedAt: new Date(1000) },
    { id: 'second', inviteeUid: 'b', rewardCheckedAt: new Date(2000) }
  ];
  beforeEach(() => {
    vi.resetAllMocks();
    query.mockResolvedValue(rows);
    claim.mockResolvedValue({ count: 1 });
  });
  it('does not dispatch a candidate another replica already advanced', async () => {
    claim.mockResolvedValueOnce({ count: 0 });
    expect(await takeMissingReferralRewards()).toEqual([rows[1]]);
    expect(claim).toHaveBeenCalledWith({
      where: { id: 'first', rewardCheckedAt: rows[0].rewardCheckedAt },
      data: { rewardCheckedAt: expect.any(Date) }
    });
  });
  it('leaves a failed claim retryable and continues the batch', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    claim.mockRejectedValueOnce(new Error('storage unavailable'));
    try {
      expect(await takeMissingReferralRewards()).toEqual([rows[1]]);
      expect(claim).toHaveBeenCalledTimes(2);
    } finally {
      error.mockRestore();
    }
  });
  it('advances even a future-dated cursor and retries only rolled-back write conflicts', async () => {
    const future = new Date(Date.now() + 60_000);
    query.mockResolvedValue([{ ...rows[0], rewardCheckedAt: future }]);
    claim.mockRejectedValueOnce(Object.assign(new Error('serialization'), { code: 'P2034' }));
    expect(await takeMissingReferralRewards()).toHaveLength(1);
    expect(claim).toHaveBeenCalledTimes(2);
    expect(claim.mock.calls[1][0].data.rewardCheckedAt.getTime()).toBe(future.getTime() + 1);
  });
});
