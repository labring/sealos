import { globalPrisma } from '@/services/backend/db/init';
import { ActivityRewardStatus } from 'prisma/global/generated/client';
import { isActivityAvailable, reconcileGrant, redeemGrant } from './rewards';

// 每轮限量，防止大表拖垮 cron 周期
const BATCH_LIMIT = 50;
// 滞留 REDEEMING 超过该时长视为本次核销中断，先对账再决定补记/退回
const REDEEMING_STUCK_MS = 5 * 60 * 1000;
// 重试退避：min(2^attempt × 60s, 30min)
const retryBackoffMs = (attemptCount: number) =>
  Math.min(2 ** attemptCount * 60 * 1000, 30 * 60 * 1000);

/**
 * 活动奖励补偿 worker（croner 每 60s 调一次，挂载点沿用 getAppConfig 的惰性注册）：
 * 1. 滞留 REDEEMING > 5min 的 grant 先对账（补记成功 / 冲突停试 / 退回 READY）；
 * 2. READY / RETRYABLE_FAILURE 的 grant 到期后重试核销（conflict:* 永久跳过）。
 * 多副本靠 redeemGrant 的条件更新抢占，安全；任何错误只记日志，绝不让 cron 抛出。
 */
export const activityRewardJob = async () => {
  try {
    if (!isActivityAvailable()) return;

    const stuckGrants = await globalPrisma.activityRewardGrant.findMany({
      where: {
        status: ActivityRewardStatus.REDEEMING,
        lastAttemptAt: { lte: new Date(Date.now() - REDEEMING_STUCK_MS) }
      },
      orderBy: { lastAttemptAt: 'asc' },
      take: BATCH_LIMIT
    });
    for (const grant of stuckGrants) {
      await reconcileGrant(grant).catch((error) => {
        console.error('[activityRewardJob] reconcile stuck grant failed', {
          grantId: grant.id,
          error
        });
      });
    }

    const retryCandidates = await globalPrisma.activityRewardGrant.findMany({
      where: {
        status: { in: [ActivityRewardStatus.READY, ActivityRewardStatus.RETRYABLE_FAILURE] },
        // 先排除永久冲突再限量，避免停试记录长期占满补偿批次；保留 NULL 原因的 READY。
        OR: [{ failureReason: null }, { failureReason: { not: { startsWith: 'conflict:' } } }]
      },
      orderBy: { lastAttemptAt: 'asc' },
      take: BATCH_LIMIT
    });
    const now = Date.now();
    for (const grant of retryCandidates) {
      // 冲突类失败停止重试、禁止补发新码
      if (grant.failureReason?.startsWith('conflict:')) continue;
      // 退避未到期的本轮跳过（attemptCount 在抢占核销时递增）
      if (
        grant.lastAttemptAt &&
        now - grant.lastAttemptAt.getTime() < retryBackoffMs(grant.attemptCount)
      ) {
        continue;
      }
      await redeemGrant(grant).catch((error) => {
        console.error('[activityRewardJob] retry grant failed', { grantId: grant.id, error });
      });
    }
  } catch (error) {
    console.error('[activityRewardJob] error:', error);
  }
};
