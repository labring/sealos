import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ActivityRewardStatus, Prisma } from 'prisma/global/generated/client';

const { findGrants, queryRaw, grantUserRewards } = vi.hoisted(() => ({
  findGrants: vi.fn(),
  queryRaw: vi.fn(),
  grantUserRewards: vi.fn()
}));

vi.mock('@/services/backend/db/init', () => ({
  globalPrisma: {
    activityRewardGrant: { findMany: findGrants },
    desktopLoginRecord: { updateMany: vi.fn() },
    $queryRaw: queryRaw
  }
}));
vi.mock('@/services/backend/activity/rewards', () => ({
  isActivityAvailable: vi.fn(() => true),
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

// 模拟这组 nullable 字段查询的数据库筛选（failureReason / lastAttemptAt）与
// LIMIT，复现批次饥饿；lastAttemptAt 排序按 PostgreSQL ASC NULLS LAST 语义。
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
  afterEach(() => vi.restoreAllMocks());

  beforeEach(() => {
    vi.resetAllMocks();
    vi.spyOn(Date, 'now').mockReturnValue(NOW);
    vi.mocked(redeemGrant).mockResolvedValue(undefined);
    queryRaw.mockResolvedValue([]);
    grantUserRewards.mockResolvedValue(undefined);
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
    // 复现 PostgreSQL NULLS LAST 饥饿：50 条退避中的旧失败占满 LIMIT，
    // 新 READY（lastAttemptAt=NULL）必须仍有独立批次被核销。
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
    // 首次创建事务失败后只剩登录事实：不依赖邀请关系或用户再次登录，cron 必须补建。
    seedRetryQueue([]);
    const userUid = '00000000-0000-4000-8000-00000000000b';
    queryRaw.mockResolvedValueOnce([{ userUid }]).mockResolvedValueOnce([]);

    await activityRewardJob();

    expect(grantUserRewards).toHaveBeenCalledExactlyOnceWith(userUid);
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
