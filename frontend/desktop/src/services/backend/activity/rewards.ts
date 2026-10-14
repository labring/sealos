import { getVersion } from '@/services/enable';
import { globalPrisma } from '@/services/backend/db/init';
import { callBillingService } from '../auth';
import {
  ActivityRewardGrant,
  ActivityRewardStatus,
  ActivityRewardType,
  RechargeCodeType,
  RegistrationSourceType
} from 'prisma/global/generated/client';
import { generateActivityGiftCode } from './codes';
import {
  ACTIVITY_RULE_VERSION,
  activityGiftCodeComment,
  firstLoginBusinessKey,
  referralInviteeBusinessKey,
  referralInviterBusinessKey,
  rewardAmount
} from './constants';
import { isUniqueConstraintError } from './registration';

// 活动仅国内部署开放（desktop.layout.version !== 'en'）
export const isActivityAvailable = () => getVersion() !== 'en';

// 资格事实（全部服务端读取；三种奖励共用同一套推导，避免判定不一致）
type EligibilityFacts = {
  // 历史用户无 RegistrationSource 行按 WEB（可领）处理，不得武断归为 API
  source: RegistrationSourceType;
  // 个人或企业实名均有效
  isRealnameVerified: boolean;
  hasClientLogin: boolean;
};

export const readEligibilityFacts = async (userUid: string): Promise<EligibilityFacts> => {
  const [sourceRow, personalRealname, enterpriseRealname, loginRecord] = await Promise.all([
    globalPrisma.registrationSource.findUnique({
      where: { userUid },
      select: { source: true }
    }),
    globalPrisma.userRealNameInfo.findUnique({
      where: { userUid },
      select: { isVerified: true }
    }),
    globalPrisma.enterpriseRealNameInfo.findUnique({
      where: { userUid },
      select: { isVerified: true }
    }),
    globalPrisma.desktopLoginRecord.findUnique({
      where: { userUid },
      select: { userUid: true }
    })
  ]);
  return {
    source: sourceRow?.source ?? RegistrationSourceType.WEB,
    isRealnameVerified: !!(personalRealname?.isVerified || enterpriseRealname?.isVerified),
    hasClientLogin: !!loginRecord
  };
};

type CreateRewardGrantResult = {
  grant: ActivityRewardGrant;
  // false = 唯一键冲突命中的既有行（并发重复创建按「已发放」处理）
  created: boolean;
};

/**
 * 奖励行 + 活动码 + 创建审计在一个全局库事务内创建：
 * GiftCode 先建、grant 携 giftCodeId；businessKey 唯一约束即幂等。
 */
const createRewardGrant = async (params: {
  recipientUid: string;
  type: ActivityRewardType;
  businessKey: string;
  referralId?: string;
}): Promise<CreateRewardGrantResult> => {
  const amount = rewardAmount(params.type);
  try {
    const grant = await globalPrisma.$transaction(async (tx) => {
      // 活动码不设受益人字段（所有者决定，2026-10-14）：防抢兑依赖 24 位随机码保密、
      // 不向客户端下发、创建后立即以受益人身份核销
      const giftCode = await tx.giftCode.create({
        data: {
          code: generateActivityGiftCode(),
          creditAmount: amount,
          comment: activityGiftCodeComment(params.type, params.businessKey)
        }
      });
      await tx.giftCodeCreation.create({
        data: {
          giftCodeId: giftCode.id,
          // 审计上明确是系统为受益人创建的活动码，不伪装成手动充值
          createdByUserUid: params.recipientUid,
          rechargeType: RechargeCodeType.ACTIVITY_RECHARGE
        }
      });
      return await tx.activityRewardGrant.create({
        data: {
          recipientUid: params.recipientUid,
          type: params.type,
          referralId: params.referralId,
          businessKey: params.businessKey,
          amount,
          giftCodeId: giftCode.id,
          status: ActivityRewardStatus.READY,
          ruleVersion: ACTIVITY_RULE_VERSION
        }
      });
    });
    return { grant, created: true };
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      // 唯一约束冲突：businessKey / giftCodeId / 随机 code
      const existing = await globalPrisma.activityRewardGrant.findUnique({
        where: { businessKey: params.businessKey }
      });
      if (existing) return { grant: existing, created: false };
      // businessKey 未命中说明是随机码撞车：重抛由下次触发自愈（重试换码）
    }
    throw error;
  }
};

const markRedeemed = async (grantId: string, redeemedAt: Date) =>
  globalPrisma.activityRewardGrant.updateMany({
    where: { id: grantId, status: ActivityRewardStatus.REDEEMING },
    data: { status: ActivityRewardStatus.REDEEMED, redeemedAt, failureReason: null }
  });

const markRetryableFailure = async (grantId: string, reason: string) =>
  globalPrisma.activityRewardGrant.updateMany({
    where: {
      id: grantId,
      status: { in: [ActivityRewardStatus.REDEEMING, ActivityRewardStatus.READY] }
    },
    data: { status: ActivityRewardStatus.RETRYABLE_FAILURE, failureReason: reason }
  });

/**
 * 自动核销：条件更新抢占（READY/RETRYABLE_FAILURE → REDEEMING，多副本安全），
 * 以受益人身份调用账务（内部 billing JWT），成功置 REDEEMED。
 */
export const redeemGrant = async (grant: ActivityRewardGrant): Promise<void> => {
  const claimed = await globalPrisma.activityRewardGrant.updateMany({
    where: {
      id: grant.id,
      status: { in: [ActivityRewardStatus.READY, ActivityRewardStatus.RETRYABLE_FAILURE] }
    },
    data: {
      status: ActivityRewardStatus.REDEEMING,
      attemptCount: { increment: 1 },
      lastAttemptAt: new Date(),
      failureReason: null
    }
  });
  if (claimed.count === 0) return; // 已被其他副本抢占或已完成

  try {
    const [giftCode, user] = await Promise.all([
      globalPrisma.giftCode.findUnique({
        where: { id: grant.giftCodeId },
        select: { code: true }
      }),
      globalPrisma.user.findUnique({
        where: { uid: grant.recipientUid },
        select: { name: true }
      })
    ]);
    if (!giftCode) throw new Error(`redeemGrant: gift code missing for grant ${grant.id}`);
    if (!user) throw new Error(`redeemGrant: recipient user missing for grant ${grant.id}`);

    // body 字段对齐 ParseUseGiftCodeReq（仅 code；身份走 Authorization 内部 token）
    await callBillingService(
      '/account/v1alpha1/gift-code/use',
      { userUid: grant.recipientUid, userId: user.name },
      { code: giftCode.code }
    );

    await markRedeemed(grant.id, new Date());
  } catch (error) {
    console.error('redeemGrant: redeem failed, start reconcile', { grantId: grant.id, error });
    // 失败/超时走对账，绝不能把 grant 永久卡在 REDEEMING
    await reconcileGrant(grant).catch((reconcileError) => {
      console.error('redeemGrant: reconcile failed', { grantId: grant.id, error: reconcileError });
    });
  }
};

/**
 * 对账（核销超时/未知错误时）：读 GiftCode 行，按三分支处理：
 * - used ∧ usedBy = 受益人 → 补记成功（响应丢失不重复充值）；
 * - used ∧ usedBy ≠ 受益人 → conflict:used_by_other，停止重试、禁止补发新码；
 * - 未使用 → 退回 READY 由补偿 worker 按退避重试。
 */
export const reconcileGrant = async (grant: ActivityRewardGrant): Promise<void> => {
  const fresh = await globalPrisma.activityRewardGrant.findUnique({ where: { id: grant.id } });
  if (!fresh || fresh.status === ActivityRewardStatus.REDEEMED) return;

  const giftCode = await globalPrisma.giftCode.findUnique({
    where: { id: fresh.giftCodeId }
  });
  if (!giftCode) {
    await markRetryableFailure(fresh.id, 'gift_code_missing');
    return;
  }

  if (giftCode.used && giftCode.usedBy === fresh.recipientUid) {
    await globalPrisma.activityRewardGrant.updateMany({
      where: {
        id: fresh.id,
        status: {
          in: [
            ActivityRewardStatus.READY,
            ActivityRewardStatus.REDEEMING,
            ActivityRewardStatus.RETRYABLE_FAILURE
          ]
        }
      },
      data: {
        status: ActivityRewardStatus.REDEEMED,
        redeemedAt: giftCode.usedAt ?? new Date(),
        failureReason: null
      }
    });
    return;
  }

  if (giftCode.used && giftCode.usedBy !== fresh.recipientUid) {
    // conflict: 前缀 worker 永久跳过；记录异常供人工排查
    await markRetryableFailure(fresh.id, 'conflict:used_by_other');
    console.error('reconcileGrant: activity gift code used by other user, stop retrying', {
      grantId: fresh.id,
      giftCodeId: giftCode.id
    });
    return;
  }

  // 未使用：退回 READY
  await globalPrisma.activityRewardGrant.updateMany({
    where: {
      id: fresh.id,
      status: {
        in: [ActivityRewardStatus.REDEEMING, ActivityRewardStatus.RETRYABLE_FAILURE]
      }
    },
    data: { status: ActivityRewardStatus.READY }
  });
};

/**
 * 统一资格检查与发奖入口。触发点：客户端登录上报、实名成功回调、活动状态查询、
 * 受邀人发奖成功后对邀请人递归。全部事实服务端读取，businessKey 幂等。
 */
export const checkAndGrantUserRewards = async (userUid: string): Promise<void> => {
  try {
    if (!isActivityAvailable()) return;

    const facts = await readEligibilityFacts(userUid);
    // API 注册账号不参与任何奖励（含作为邀请人）
    if (facts.source === RegistrationSourceType.API) return;

    // 首登礼 + 受邀礼：需客户端登录 ∧ 实名
    if (facts.hasClientLogin && facts.isRealnameVerified) {
      const firstLogin = await createRewardGrant({
        recipientUid: userUid,
        type: ActivityRewardType.DESKTOP_FIRST_LOGIN,
        businessKey: firstLoginBusinessKey(userUid)
      });
      // 只有新建的 grant 立即核销；既有行交给补偿 worker 按退避重试，避免状态轮询打成重试风暴
      if (firstLogin.created) await redeemGrant(firstLogin.grant);

      const referral = await globalPrisma.registrationReferral.findUnique({
        where: { inviteeUid: userUid }
      });
      if (referral) {
        const inviteeGrant = await createRewardGrant({
          recipientUid: userUid,
          type: ActivityRewardType.REFERRAL_INVITEE,
          businessKey: referralInviteeBusinessKey(referral.id),
          referralId: referral.id
        });
        if (inviteeGrant.created) await redeemGrant(inviteeGrant.grant);
        // 邀请人侧检查不依赖 inviteeGrant.created：即使本次是命中既有行（上次
        // 递归中断或并发竞争），也要重跑，保证「邀请人不在线也能到账」有多条
        // 自愈路径。递归只往 inviter 方向一层，不会回环。
        await checkAndGrantUserRewards(referral.inviterUid);
      }
    }

    // 邀请人礼：对我发出的每条邀请，受邀人条件齐则发放
    const myReferrals = await globalPrisma.registrationReferral.findMany({
      where: { inviterUid: userUid },
      select: { id: true, inviteeUid: true }
    });
    for (const referral of myReferrals) {
      const inviteeFacts = await readEligibilityFacts(referral.inviteeUid);
      if (
        inviteeFacts.source === RegistrationSourceType.API ||
        !inviteeFacts.hasClientLogin ||
        !inviteeFacts.isRealnameVerified
      ) {
        continue;
      }
      const inviterGrant = await createRewardGrant({
        recipientUid: userUid,
        type: ActivityRewardType.REFERRAL_INVITER,
        businessKey: referralInviterBusinessKey(referral.id),
        referralId: referral.id
      });
      if (inviterGrant.created) await redeemGrant(inviterGrant.grant);
    }
  } catch (error) {
    // 触发点（登录上报/实名回调/状态查询）都不允许被发奖失败阻断
    console.error('checkAndGrantUserRewards: failed', { userUid, error });
  }
};
