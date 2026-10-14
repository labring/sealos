import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ActivityRewardStatus, Prisma } from 'prisma/global/generated/client';

const { findGrants } = vi.hoisted(() => ({ findGrants: vi.fn() }));

vi.mock('@/services/backend/db/init', () => ({
  globalPrisma: { activityRewardGrant: { findMany: findGrants } }
}));
vi.mock('@/services/backend/activity/rewards', () => ({
  isActivityAvailable: vi.fn(() => true),
  reconcileGrant: vi.fn(),
  redeemGrant: vi.fn()
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

// 模拟这组 nullable string 查询的数据库筛选，再执行 LIMIT，复现批次饥饿。
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

const seedRetryQueue = (rows: RetryGrant[]) => {
  findGrants.mockImplementation(
    async (query: { where: Prisma.ActivityRewardGrantWhereInput; take: number }) => {
      if (query.where.status === ActivityRewardStatus.REDEEMING) return [];
      return rows
        .filter((row) => failureMatches(row.failureReason, query.where))
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
    vi.clearAllMocks();
    vi.spyOn(Date, 'now').mockReturnValue(NOW);
    vi.mocked(redeemGrant).mockResolvedValue();
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
});
