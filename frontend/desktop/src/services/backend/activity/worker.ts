import { globalPrisma } from '@/services/backend/db/init';
import { ActivityRewardStatus, Prisma } from 'prisma/global/generated/client';
import {
  checkAndGrantUserRewards,
  isActivityAvailable,
  reconcileGrant,
  redeemGrant
} from './rewards';

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
 * 2. READY / RETRYABLE_FAILURE 的 grant 到期后重试核销（conflict:* 永久跳过）；
 * 3. 扫描条件已齐但奖励行缺失的邀请关系并补建（受邀人触发链路中断时的兜底，
 *    保证邀请人不在线、进程崩溃也能到账）。checkAndGrantUserRewards 自身幂等。
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

    // PostgreSQL ASC 默认 NULLS LAST：一批持续失败的旧记录（lastAttemptAt 非空）会
    // 占满限量，饿死从未尝试过的新 READY 奖励（lastAttemptAt = NULL）。拆两段查询，
    // 从未尝试的先行，失败退避的另占一批，互不挤占。
    const retryFilter: Prisma.ActivityRewardGrantWhereInput = {
      status: { in: [ActivityRewardStatus.READY, ActivityRewardStatus.RETRYABLE_FAILURE] },
      // 先排除永久冲突再限量，避免停试记录长期占满补偿批次；保留 NULL 原因的 READY。
      OR: [{ failureReason: null }, { failureReason: { not: { startsWith: 'conflict:' } } }]
    };
    const [neverAttempted, backoffRetries] = await Promise.all([
      globalPrisma.activityRewardGrant.findMany({
        where: { ...retryFilter, lastAttemptAt: null },
        take: BATCH_LIMIT
      }),
      globalPrisma.activityRewardGrant.findMany({
        where: { ...retryFilter, lastAttemptAt: { not: null } },
        orderBy: { lastAttemptAt: 'asc' },
        take: BATCH_LIMIT
      })
    ]);
    const now = Date.now();
    for (const grant of [...neverAttempted, ...backoffRetries]) {
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

    await scanMissingReferralRewards();
  } catch (error) {
    console.error('[activityRewardJob] error:', error);
  }
};

type MissingGrantReferral = {
  id: string;
  inviteeUid: string;
};

// 条件齐备（受邀人已客户端登录 + 实名 + 非 API 来源）但邀请两侧任一奖励行
// 缺失的关系。资格写进 SQL 是为了把「永久不满足条件」的旧关系排除在扫描外，
// 否则它们每轮都命中、白白占用限量；checkAndGrantUserRewards 仍会重读事实兜底。
const MISSING_REFERRAL_REWARDS_SQL = Prisma.sql`
  SELECT r."id", r."inviteeUid"
  FROM "RegistrationReferral" r
  WHERE EXISTS (
      SELECT 1 FROM "DesktopLoginRecord" d WHERE d."userUid" = r."inviteeUid")
    AND (
      EXISTS (SELECT 1 FROM "UserRealNameInfo" u
              WHERE u."userUid" = r."inviteeUid" AND u."isVerified" = true)
      OR EXISTS (SELECT 1 FROM "EnterpriseRealNameInfo" e
                 WHERE e."userUid" = r."inviteeUid" AND e."isVerified" = true)
    )
    AND NOT EXISTS (
      SELECT 1 FROM "RegistrationSource" s
      WHERE s."userUid" = r."inviteeUid" AND s."source" = 'API')
    AND (
      NOT EXISTS (SELECT 1 FROM "ActivityRewardGrant" g
                  WHERE g."referralId" = r."id" AND g."type" = 'REFERRAL_INVITER')
      OR NOT EXISTS (SELECT 1 FROM "ActivityRewardGrant" g
                     WHERE g."referralId" = r."id" AND g."type" = 'REFERRAL_INVITEE')
    )
  ORDER BY r."registeredAt" DESC
  LIMIT 20
`;

/**
 * 缺失奖励扫描：以受邀人身份跑一遍 checkAndGrantUserRewards（幂等），一次覆盖
 * 受邀人的首登礼/受邀礼并递归补建邀请人奖励。命中即治愈——补建成功后关系不再
 * 匹配扫描条件；账务故障期会持续命中，由上面的重试路径按退避消化。
 */
const scanMissingReferralRewards = async () => {
  const referrals: MissingGrantReferral[] = await globalPrisma.$queryRaw(
    MISSING_REFERRAL_REWARDS_SQL
  );
  for (const referral of referrals) {
    await checkAndGrantUserRewards(referral.inviteeUid).catch((error) => {
      console.error('[activityRewardJob] rebuild missing referral rewards failed', {
        referralId: referral.id,
        error
      });
    });
  }
};
