import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ActivityRewardStatus, Prisma } from 'prisma/global/generated/client';

const { findGrants, queryRaw, grantUserRewards, updateLoginRecord } = vi.hoisted(() => ({
  findGrants: vi.fn(),
  queryRaw: vi.fn(),
  grantUserRewards: vi.fn(),
  updateLoginRecord: vi.fn()
}));

vi.mock('@/services/backend/db/init', () => ({
  globalPrisma: {
    activityRewardGrant: { findMany: findGrants },
    desktopLoginRecord: { updateMany: updateLoginRecord },
    $queryRaw: queryRaw
  }
}));
vi.mock('@/services/enable', () => ({ isActivityAvailable: vi.fn(() => true) }));
vi.mock('@/services/backend/activity/rewards', () => ({
  reconcileGrant: vi.fn(),
  redeemGrant: vi.fn(),
  checkAndGrantUserRewards: grantUserRewards
}));

import { redeemGrant } from '@/services/backend/activity/rewards';
import { activityRewardJob } from '@/services/backend/activity/worker';

const NOW = Date.parse('2026-10-14T00:00:00Z');
type RetryGrant = {
  id: string;
  status: ActivityRewardStatus;
  failureReason: string | null;
  lastAttemptAt: Date | null;
  attemptCount: number;
};

// Emulate the DB filtering on the nullable fields (failureReason / lastAttemptAt)
// and LIMIT to reproduce batch starvation; lastAttemptAt sorts with PostgreSQL
// ASC NULLS LAST semantics.
const failureMatches = (
  reason: string | null,
  filter: Prisma.ActivityRewardGrantWhereInput
): boolean => {
  if (filter.OR && !filter.OR.some((part) => failureMatches(reason, part))) return false;
  const condition = filter.failureReason;
  if (condition === undefined) return true;
  if (condition === null || typeof condition === 'string') return reason === condition;
  if (
    condition.not &&
    typeof condition.not === 'object' &&
    typeof condition.not.startsWith === 'string'
  ) {
    return reason !== null && !reason.startsWith(condition.not.startsWith);
  }
  throw new Error('Unsupported failureReason filter in worker test');
};

const lastAttemptMatches = (
  value: Date | null,
  filter: Prisma.ActivityRewardGrantWhereInput
): boolean => {
  const condition = filter.lastAttemptAt;
  if (condition === undefined) return true;
  if (condition === null) return value === null;
  if (typeof condition === 'object' && 'not' in condition && condition.not === null) {
    return value !== null;
  }
  throw new Error('Unsupported lastAttemptAt filter in worker test');
};

const seedRetryQueue = (rows: RetryGrant[]) => {
  findGrants.mockImplementation(
    async (query: { where: Prisma.ActivityRewardGrantWhereInput; take: number }) => {
      if (query.where.status === ActivityRewardStatus.REDEEMING) return [];
      return rows
        .filter(
          (row) =>
            failureMatches(row.failureReason, query.where) &&
            lastAttemptMatches(row.lastAttemptAt, query.where)
        )
        .sort(
          (a, b) =>
            (a.lastAttemptAt?.getTime() ?? Infinity) - (b.lastAttemptAt?.getTime() ?? Infinity)
        )
        .slice(0, query.take);
    }
  );
};

describe('activity reward compensation worker', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  beforeEach(() => {
    vi.resetAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(redeemGrant).mockResolvedValue(undefined);
    queryRaw.mockResolvedValue([]);
    grantUserRewards.mockResolvedValue(undefined);
    updateLoginRecord.mockResolvedValue({ count: 1 });
  });

  it('retries eligible rewards behind a full batch of permanent conflicts', async () => {
    const conflicts: RetryGrant[] = Array.from({ length: 50 }, (_, index) => ({
      id: `conflict-${index}`,
      status: ActivityRewardStatus.RETRYABLE_FAILURE,
      failureReason: 'conflict:used_by_other',
      lastAttemptAt: new Date(NOW - 2 * 60 * 60 * 1000),
      attemptCount: 1
    }));
    const retry: RetryGrant = {
      id: 'network-failure',
      status: ActivityRewardStatus.RETRYABLE_FAILURE,
      failureReason: 'network_error',
      lastAttemptAt: new Date(NOW - 60 * 60 * 1000),
      attemptCount: 1
    };
    const ready: RetryGrant = {
      id: 'ready',
      status: ActivityRewardStatus.READY,
      failureReason: null,
      lastAttemptAt: null,
      attemptCount: 0
    };
    seedRetryQueue([...conflicts, retry, ready]);

    await activityRewardJob();

    expect(redeemGrant).toHaveBeenCalledTimes(2);
    expect(redeemGrant).toHaveBeenCalledWith(retry);
    expect(redeemGrant).toHaveBeenCalledWith(ready);
  });

  it('redeems never-attempted READY rewards behind a full batch of stale failures', async () => {
    // Reproduces PostgreSQL NULLS LAST starvation: 50 stale failures in backoff
    // fill the LIMIT, so fresh READY rows (lastAttemptAt=NULL) must still get
    // redeemed by a separate batch.
    const staleFailures: RetryGrant[] = Array.from({ length: 50 }, (_, index) => ({
      id: `stale-${index}`,
      status: ActivityRewardStatus.RETRYABLE_FAILURE,
      failureReason: 'network_error',
      lastAttemptAt: new Date(NOW - 2 * 60 * 60 * 1000),
      attemptCount: 1
    }));
    const fresh: RetryGrant = {
      id: 'fresh-ready',
      status: ActivityRewardStatus.READY,
      failureReason: null,
      lastAttemptAt: null,
      attemptCount: 0
    };
    seedRetryQueue([...staleFailures, fresh]);

    await activityRewardJob();

    expect(redeemGrant).toHaveBeenCalledWith(fresh);
  });

  it('still respects retry backoff after excluding permanent conflicts', async () => {
    seedRetryQueue([
      {
        id: 'backoff',
        status: ActivityRewardStatus.READY,
        failureReason: null,
        lastAttemptAt: new Date(NOW - 60 * 1000),
        attemptCount: 1
      }
    ]);

    await activityRewardJob();

    expect(redeemGrant).not.toHaveBeenCalled();
  });

  it('rebuilds missing referral rewards found by the scan', async () => {
    seedRetryQueue([]);
    queryRaw
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        { id: 'referral-1', inviteeUid: '00000000-0000-4000-8000-00000000000a' }
      ]);

    await activityRewardJob();

    expect(grantUserRewards).toHaveBeenCalledTimes(1);
    expect(grantUserRewards).toHaveBeenCalledWith('00000000-0000-4000-8000-00000000000a');
  });

  it('rebuilds the first-login gift without an invitation or an existing grant', async () => {
    // Only the login fact remains after the initial creation transaction failed:
    // without a referral or another login, the cron must rebuild the reward.
    seedRetryQueue([]);
    const userUid = '00000000-0000-4000-8000-00000000000b';
    queryRaw.mockResolvedValueOnce([{ userUid }]).mockResolvedValueOnce([]);

    await activityRewardJob();

    expect(grantUserRewards).toHaveBeenCalledExactlyOnceWith(userUid);
  });

  it.each([
    { random: 0, delays: [100, 200] },
    { random: 0.999, delays: [199, 399] }
  ])('recovers from write conflicts with jitter ($random)', async ({ random, delays }) => {
    seedRetryQueue([]);
    vi.spyOn(Math, 'random').mockReturnValue(random);
    const userUid = 'first-login-user';
    const conflict = Object.assign(new Error('write conflict'), { code: 'P2034' });
    queryRaw.mockResolvedValueOnce([{ userUid }]).mockResolvedValueOnce([]);
    updateLoginRecord.mockRejectedValueOnce(conflict).mockRejectedValueOnce(conflict);

    const job = activityRewardJob();
    await vi.advanceTimersByTimeAsync(0);
    expect(updateLoginRecord).toHaveBeenCalledTimes(1);
    expect(grantUserRewards).not.toHaveBeenCalled();

    for (const [index, delay] of delays.entries()) {
      await vi.advanceTimersByTimeAsync(delay - 1);
      expect(updateLoginRecord).toHaveBeenCalledTimes(index + 1);
      await vi.advanceTimersByTimeAsync(1);
      expect(updateLoginRecord).toHaveBeenCalledTimes(index + 2);
    }
    await job;

    expect(grantUserRewards).toHaveBeenCalledExactlyOnceWith(userUid);
    expect(console.error).not.toHaveBeenCalled();
  });

  it('continues both scans after three failed writes and retries the user next round', async () => {
    seedRetryQueue([]);
    const conflict = Object.assign(new Error('write conflict'), { code: 'P2034' });
    const blockedUser = 'blocked-user';
    const nextUser = 'next-user';
    const inviteeUid = 'referral-user';
    queryRaw
      .mockResolvedValueOnce([{ userUid: blockedUser }, { userUid: nextUser }])
      .mockResolvedValueOnce([{ id: 'referral-1', inviteeUid }]);
    updateLoginRecord
      .mockRejectedValueOnce(conflict)
      .mockRejectedValueOnce(conflict)
      .mockRejectedValueOnce(conflict);

    const job = activityRewardJob();
    await vi.runAllTimersAsync();
    await job;

    expect(updateLoginRecord).toHaveBeenCalledTimes(4);
    expect(grantUserRewards.mock.calls).toEqual([[nextUser], [inviteeUid]]);
    expect(console.error).toHaveBeenCalledExactlyOnceWith(
      '[activityRewardJob] advance first-login scan failed',
      { userUid: blockedUser, code: 'P2034', attempts: 3, error: conflict }
    );

    queryRaw.mockResolvedValueOnce([{ userUid: blockedUser }]).mockResolvedValueOnce([]);
    await activityRewardJob();

    expect(updateLoginRecord).toHaveBeenCalledTimes(5);
    expect(grantUserRewards.mock.calls).toEqual([[nextUser], [inviteeUid], [blockedUser]]);
  });

  it.each([
    Object.assign(new Error('connection timed out'), { code: 'P2024' }),
    new Error('unexpected failure'),
    null
  ])('skips a failed user without retrying non-conflict errors (%s)', async (error) => {
    seedRetryQueue([]);
    queryRaw
      .mockResolvedValueOnce([{ userUid: 'failed-user' }, { userUid: 'next-user' }])
      .mockResolvedValueOnce([]);
    updateLoginRecord.mockRejectedValueOnce(error);

    await activityRewardJob();

    expect(updateLoginRecord).toHaveBeenCalledTimes(2);
    expect(grantUserRewards).toHaveBeenCalledExactlyOnceWith('next-user');
    expect(console.error).toHaveBeenCalledExactlyOnceWith(
      '[activityRewardJob] advance first-login scan failed',
      {
        userUid: 'failed-user',
        code: error && 'code' in error ? error.code : undefined,
        attempts: 1,
        error
      }
    );
    expect(vi.getTimerCount()).toBe(0);
  });

  it('does not retry reward granting when it fails with P2034', async () => {
    seedRetryQueue([]);
    queryRaw
      .mockResolvedValueOnce([{ userUid: 'failed-user' }, { userUid: 'next-user' }])
      .mockResolvedValueOnce([]);
    grantUserRewards.mockRejectedValueOnce(
      Object.assign(new Error('reward conflict'), { code: 'P2034' })
    );

    await activityRewardJob();

    expect(updateLoginRecord).toHaveBeenCalledTimes(2);
    expect(grantUserRewards.mock.calls).toEqual([['failed-user'], ['next-user']]);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('still rebuilds referral rewards when the first-login scan fails', async () => {
    seedRetryQueue([]);
    const inviteeUid = '00000000-0000-4000-8000-00000000000a';
    queryRaw
      .mockRejectedValueOnce(new Error('first-login scan failed'))
      .mockResolvedValueOnce([{ id: 'referral-1', inviteeUid }]);

    await activityRewardJob();

    expect(grantUserRewards).toHaveBeenCalledExactlyOnceWith(inviteeUid);
  });

  it('keeps the cron cycle alive when the scan query fails', async () => {
    seedRetryQueue([]);
    queryRaw.mockRejectedValue(new Error('db down'));

    await expect(activityRewardJob()).resolves.toBeUndefined();
    expect(grantUserRewards).not.toHaveBeenCalled();
  });
});
