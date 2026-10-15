import { getVersion } from '@/services/enable';
import { globalPrisma } from '@/services/backend/db/init';
import { callBillingService } from '../auth';
import {
  ActivityRewardGrant,
  ActivityRewardStatus,
  ActivityRewardType,
  RechargeCodeType,
  RegistrationSourceType,
  Prisma
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
import { rewardIdentityKeys } from './identity.cjs';

// 活动仅国内部署开放（desktop.layout.version !== 'en'）
export const isActivityAvailable = () => getVersion() !== 'en';

// 资格事实（全部服务端读取；三种奖励共用同一套推导，避免判定不一致）
type EligibilityFacts = {
  // 历史用户无 RegistrationSource 行按 WEB（可领）处理，不得武断归为 API
  source: RegistrationSourceType;
  // 个人或企业实名均有效
  isRealnameVerified: boolean;
  hasClientLogin: boolean;
  identityKey: string | null;
  identityKeys: string[];
};

export const readIdentityConfig = async () => {
  const config = await globalPrisma.activityRewardIdentityConfig.findUnique({
    where: { id: 'v1' }
  });
  if (!config) throw new Error('Activity identity configuration missing; apply migration first');
  return config;
};

export const readEligibilityFacts = async (userUid: string): Promise<EligibilityFacts> => {
  const [sourceRow, personalRealname, enterpriseRealname, loginRecord, config] = await Promise.all([
    globalPrisma.registrationSource.findUnique({
      where: { userUid },
      select: { source: true }
    }),
    globalPrisma.userRealNameInfo.findUnique({
      where: { userUid },
      select: { isVerified: true, idCard: true }
    }),
    globalPrisma.enterpriseRealNameInfo.findUnique({
      where: { userUid },
      select: { isVerified: true, additionalInfo: true }
    }),
    globalPrisma.desktopLoginRecord.findUnique({
      where: { userUid },
      select: { userUid: true }
    }),
    readIdentityConfig()
  ]);
  const identityKeys = rewardIdentityKeys(config.pepper, personalRealname, enterpriseRealname);
  return {
    source: sourceRow?.source ?? RegistrationSourceType.WEB,
    isRealnameVerified: !!(personalRealname?.isVerified || enterpriseRealname?.isVerified),
    hasClientLogin: !!loginRecord,
    identityKey: identityKeys[0] ?? null,
    identityKeys
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
  identityKey?: string;
}): Promise<CreateRewardGrantResult> => {
  // 状态轮询直接复用已有账本，避免每次创建兑换码再回滚。
  const existing = await globalPrisma.activityRewardGrant.findUnique({
    where: { businessKey: params.businessKey }
  });
  if (existing) return { grant: existing, created: false };
  if (params.identityKey) {
    const owner = await globalPrisma.activityRewardGrant.findUnique({
      where: { identityKey: params.identityKey }
    });
    if (owner) return { grant: owner, created: false };
  }
  const amount = rewardAmount(params.type);
  for (let attempt = 0; ; attempt++) {
    try {
      const grant = await globalPrisma.$transaction(
        async (tx) => {
          // 活动码不设受益人字段（所有者决定，2026-10-14）：防抢兑依赖 24 位随机码保密、
          // 不向客户端下发、创建后立即以受益人身份核销
          if (params.referralId) {
            const referral = await tx.registrationReferral.findUnique({
              where: { id: params.referralId }
            });
            if (!referral || referral.status === 'INELIGIBLE')
              throw new Error('Activity referral is ineligible');
          }
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
              identityKey: params.identityKey,
              amount,
              giftCodeId: giftCode.id,
              status: ActivityRewardStatus.READY,
              ruleVersion: ACTIVITY_RULE_VERSION
            }
          });
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
      );
      return { grant, created: true };
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        // 唯一约束冲突：businessKey / giftCodeId / 随机 code
        const existing = await globalPrisma.activityRewardGrant.findUnique({
          where: { businessKey: params.businessKey }
        });
        if (existing) return { grant: existing, created: false };
        if (params.identityKey) {
          const owner = await globalPrisma.activityRewardGrant.findUnique({
            where: { identityKey: params.identityKey }
          });
          if (owner) return { grant: owner, created: false };
        }
        // 随机码碰撞使用新码重试，失败事务不会留下孤立码。
        if (attempt < 2) continue;
      }
      if (
        error &&
        typeof error === 'object' &&
        'code' in error &&
        error.code === 'P2034' &&
        attempt < 2
      ) {
        continue;
      }
      throw error;
    }
  }
};

// 已有首登行拥有不可变的主体快照；换绑实名不能再占用另一个主体。
export const hasIdentityConflict = async (userUid: string, facts: EligibilityFacts) => {
  const own = await globalPrisma.activityRewardGrant.findUnique({
    where: { businessKey: firstLoginBusinessKey(userUid) }
  });
  if (own) return false;
  if (!facts.identityKey) return false;
  const owner = await globalPrisma.activityRewardGrant.findUnique({
    where: { identityKey: facts.identityKey }
  });
  return !!owner && owner.recipientUid !== userUid;
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
  if (grant.failureReason?.startsWith('conflict:')) return;
  if (grant.referralId) {
    const referral = await globalPrisma.registrationReferral.findUnique({
      where: { id: grant.referralId }
    });
    if (!referral) return;
    if (referral.status === 'INELIGIBLE') {
      await invalidateReferral(referral.id, referral.ineligibleReason ?? 'ineligible');
      return;
    }
    const [inviteeFacts, inviterFacts, owner] = await Promise.all([
      readEligibilityFacts(referral.inviteeUid),
      readEligibilityFacts(referral.inviterUid),
      globalPrisma.activityRewardGrant.findUnique({
        where: { businessKey: firstLoginBusinessKey(referral.inviteeUid) }
      })
    ]);
    const subjectKeys = new Set([...inviteeFacts.identityKeys, owner?.identityKey]);
    if (inviterFacts.identityKeys.some((key) => subjectKeys.has(key))) {
      await invalidateReferral(referral.id, 'self_identity');
      return;
    }
  }
  const claimed = await globalPrisma.$transaction(
    async (tx) => {
      if (grant.referralId) {
        const referral = await tx.registrationReferral.findUnique({
          where: { id: grant.referralId }
        });
        if (!referral || referral.status === 'INELIGIBLE') return { count: 0 };
      }
      return tx.activityRewardGrant.updateMany({
        where: {
          id: grant.id,
          status: { in: [ActivityRewardStatus.READY, ActivityRewardStatus.RETRYABLE_FAILURE] },
          OR: [{ failureReason: null }, { failureReason: { not: { startsWith: 'conflict:' } } }]
        },
        data: {
          status: ActivityRewardStatus.REDEEMING,
          attemptCount: { increment: 1 },
          lastAttemptAt: new Date(),
          failureReason: null
        }
      });
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
  );
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

  if (fresh.failureReason?.startsWith('conflict:')) return;
  if (fresh.referralId) {
    const referral = await globalPrisma.registrationReferral.findUnique({
      where: { id: fresh.referralId }
    });
    if (!referral || referral.status === 'INELIGIBLE') {
      await markRetryableFailure(fresh.id, 'conflict:ineligible_referral');
      return;
    }
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

const invalidateReferral = async (id: string, reason: string) => {
  await globalPrisma.$transaction(
    async (tx) => {
      await tx.registrationReferral.updateMany({
        where: { id },
        data: {
          status: 'INELIGIBLE',
          ineligibleReason: reason
        }
      });
      // 已发起的核销仍需对账；只停止尚未抢占的奖励。
      await tx.activityRewardGrant.updateMany({
        where: {
          referralId: id,
          status: { in: [ActivityRewardStatus.READY, ActivityRewardStatus.RETRYABLE_FAILURE] }
        },
        data: {
          status: ActivityRewardStatus.RETRYABLE_FAILURE,
          failureReason: 'conflict:ineligible_referral'
        }
      });
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
  );
};

/** 主体所有者的双方邀请礼直接补建，不递归邀请祖先。 */
const grantReferralRewards = async (
  userUid: string,
  owner: ActivityRewardGrant,
  facts: EligibilityFacts
) => {
  const referral = await globalPrisma.registrationReferral.findUnique({
    where: { inviteeUid: userUid }
  });
  if (!referral) return;
  if (referral.status === 'INELIGIBLE') {
    // 此账号先前未获资格，后来首次绑定了另一个合法主体；不能把一次拒绝变成永久账号封禁。
    if (referral.ineligibleReason !== 'identity_already_claimed') return;
    await globalPrisma.registrationReferral.updateMany({
      where: {
        id: referral.id,
        status: 'INELIGIBLE',
        ineligibleReason: 'identity_already_claimed'
      },
      data: { status: 'PENDING', ineligibleReason: null }
    });
  }
  const inviterFacts = await readEligibilityFacts(referral.inviterUid);
  const subjectKeys = new Set([...facts.identityKeys, owner.identityKey]);
  if (inviterFacts.identityKeys.some((key) => subjectKeys.has(key))) {
    await invalidateReferral(referral.id, 'self_identity');
    return;
  }
  const invitee = await createRewardGrant({
    recipientUid: userUid,
    type: ActivityRewardType.REFERRAL_INVITEE,
    businessKey: referralInviteeBusinessKey(referral.id),
    referralId: referral.id
  });
  if (invitee.created) await redeemGrant(invitee.grant);
  if (inviterFacts.source !== RegistrationSourceType.API) {
    const inviter = await globalPrisma.user.findUnique({
      where: { uid: referral.inviterUid },
      select: { uid: true }
    });
    if (inviter) {
      const grant = await createRewardGrant({
        recipientUid: referral.inviterUid,
        type: ActivityRewardType.REFERRAL_INVITER,
        businessKey: referralInviterBusinessKey(referral.id),
        referralId: referral.id
      });
      if (grant.created) await redeemGrant(grant.grant);
    }
  }
};

const grantForEligibleUser = async (userUid: string, facts: EligibilityFacts) => {
  if (facts.source === RegistrationSourceType.API) return;
  const existing = await globalPrisma.activityRewardGrant.findUnique({
    where: { businessKey: firstLoginBusinessKey(userUid) }
  });
  // 已有主体快照证明条件曾满足：不因后续材料变化阻断已取得资格的邀请补领。
  if (!existing && (!facts.hasClientLogin || !facts.isRealnameVerified || !facts.identityKey))
    return;
  const firstLogin = existing
    ? { grant: existing, created: false }
    : await createRewardGrant({
        recipientUid: userUid,
        type: ActivityRewardType.DESKTOP_FIRST_LOGIN,
        businessKey: firstLoginBusinessKey(userUid),
        identityKey: facts.identityKey!
      });
  if (
    firstLogin.grant.recipientUid !== userUid ||
    !firstLogin.grant.identityKey?.startsWith('v1:')
  ) {
    // 持久化拒绝原因，避免邀请补偿一直扫描重复主体。首登扫描轮转另有持久时间戳。
    const referral = await globalPrisma.registrationReferral.findUnique({
      where: { inviteeUid: userUid }
    });
    if (referral) await invalidateReferral(referral.id, 'identity_already_claimed');
    return;
  }
  if (firstLogin.created) await redeemGrant(firstLogin.grant);
  await grantReferralRewards(userUid, firstLogin.grant, facts);
};

/** 服务端唯一发奖入口：主体唯一约束决定账号所有权，业务键决定单项幂等。 */
export const checkAndGrantUserRewards = async (userUid: string): Promise<void> => {
  try {
    if (!isActivityAvailable()) return;
    const facts = await readEligibilityFacts(userUid);
    if (facts.source === RegistrationSourceType.API) return;
    await grantForEligibleUser(userUid, facts);
    // 只检查已持有主体资格且缺少邀请奖励的关系。未满足条件的老关系不会占满批次。
    const missing: { inviteeUid: string }[] = await globalPrisma.$queryRaw(Prisma.sql`
      SELECT r."inviteeUid" FROM "RegistrationReferral" r
      JOIN "ActivityRewardGrant" owner ON owner."businessKey" = 'DESKTOP_FIRST_LOGIN:' || r."inviteeUid"::TEXT
      WHERE r."inviterUid" = ${userUid}::UUID AND r."status" != 'INELIGIBLE'
        AND owner."identityKey" LIKE 'v1:%'
        AND NOT EXISTS (SELECT 1 FROM "ActivityRewardGrant" g
          WHERE g."referralId" = r."id" AND g."type" = 'REFERRAL_INVITER')
      ORDER BY r."registeredAt" ASC, r."id" ASC LIMIT 20
    `);
    for (const referral of missing) {
      await grantForEligibleUser(
        referral.inviteeUid,
        await readEligibilityFacts(referral.inviteeUid)
      );
    }
  } catch (error) {
    // 奖励不可用不能阻断登录/实名；持久事实留给 worker 重试。
    console.error('checkAndGrantUserRewards: failed', { userUid, error });
  }
};

// 请求-响应链路（实名回调等）等待发奖的有界超时：到点即放行响应。
// 已创建的 grant 不回滚——核销挂起的由补偿 worker 按 REDEEMING 滞留对账，
// 未创建的由缺失奖励扫描补建，因此超时不会丢奖励。
const TRIGGER_GRANT_DEADLINE_MS = 5_000;

export const checkAndGrantUserRewardsBounded = async (userUid: string): Promise<void> => {
  let timedOut = false;
  await Promise.race([
    checkAndGrantUserRewards(userUid),
    new Promise<void>((resolve) => {
      setTimeout(() => {
        timedOut = true;
        resolve();
      }, TRIGGER_GRANT_DEADLINE_MS);
    })
  ]);
  if (timedOut) {
    console.warn('checkAndGrantUserRewardsBounded: deadline exceeded, worker will reconcile', {
      userUid
    });
  }
};
