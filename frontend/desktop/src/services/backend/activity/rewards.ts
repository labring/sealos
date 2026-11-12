import { isActivityAvailable } from '@/services/enable';
import { globalPrisma } from '@/services/backend/db/init';
import { callBillingService } from '../auth';
import {
  ActivityRewardGrant,
  ActivityRewardStatus,
  ActivityRewardType,
  RegistrationSourceType,
  Prisma
} from 'prisma/global/generated/client';
import { randomUUID } from 'node:crypto';
import {
  ACTIVITY_RULE_VERSION,
  firstLoginBusinessKey,
  referralInviteeBusinessKey,
  referralInviterBusinessKey,
  rewardAmount
} from './constants';
import { isUniqueConstraintError, type TransactionClient } from './registration';
import { rewardIdentityKeys } from './identity.cjs';
import { takeMissingReferralRewards } from './referral-scan';

// Eligibility facts (all read server-side; the three reward types share one
// derivation to avoid inconsistent eligibility decisions)
type EligibilityFacts = {
  // Legacy users with no RegistrationSource row are treated as WEB (eligible);
  // never classify them as API
  source: RegistrationSourceType;
  // Either personal or enterprise real-name verification counts
  isRealnameVerified: boolean;
  hasClientLogin: boolean;
  identityKey: string | null;
  identityKeys: string[];
};

export const readIdentityConfig = async (db: TransactionClient = globalPrisma) => {
  const config = await db.activityRewardIdentityConfig.findUnique({
    where: { id: 'v1' }
  });
  if (!config) throw new Error('Activity identity configuration missing; apply migration first');
  return config;
};

export const readEligibilityFacts = async (
  userUid: string,
  db: TransactionClient = globalPrisma
): Promise<EligibilityFacts> => {
  const [sourceRow, personalRealname, enterpriseRealname, loginRecord, config] = await Promise.all([
    db.registrationSource.findUnique({
      where: { userUid },
      select: { source: true }
    }),
    db.userRealNameInfo.findUnique({
      where: { userUid },
      select: { isVerified: true, idCard: true }
    }),
    db.enterpriseRealNameInfo.findUnique({
      where: { userUid },
      select: { isVerified: true, additionalInfo: true }
    }),
    db.desktopLoginRecord.findUnique({
      where: { userUid },
      select: { userUid: true }
    }),
    readIdentityConfig(db)
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

const isRetryableTransactionError = (error: unknown) => {
  if (typeof error !== 'object' || error === null || !('code' in error)) return false;
  // PostgreSQL serializable conflicts from raw SELECT FOR UPDATE surface as P2010/40001.
  return (
    error.code === 'P2034' ||
    (error.code === 'P2010' &&
      'meta' in error &&
      typeof error.meta === 'object' &&
      error.meta !== null &&
      'code' in error.meta &&
      (error.meta.code === '40001' || error.meta.code === '40P01'))
  );
};

// Trusted business facts conflict: never continue to the other side after this.
class RewardConflictError extends Error {}

type RewardRequest = {
  recipientUid: string;
  type: ActivityRewardType;
  businessKey: string;
  referralId?: string;
  identityKey?: string;
};
const assertExistingReward = async (grant: ActivityRewardGrant, params: RewardRequest) => {
  if (
    grant.recipientUid !== params.recipientUid ||
    grant.type !== params.type ||
    (grant.referralId ?? undefined) !== params.referralId
  )
    throw new RewardConflictError('Activity business key conflicts with reward recipient');
  if (params.referralId) {
    const referral = await globalPrisma.registrationReferral.findUnique({
      where: { id: params.referralId }
    });
    const expected =
      params.type === ActivityRewardType.REFERRAL_INVITER
        ? referral?.inviterRewardAmount
        : referral?.inviteeRewardAmount;
    if (!referral || expected !== grant.amount)
      throw new RewardConflictError('Activity business key conflicts with reward snapshot');
  }
};

/** Persist eligibility and the payment intent before attempting any wallet operation. */
const createRewardGrant = async (params: RewardRequest): Promise<ActivityRewardGrant> => {
  const existing = await globalPrisma.activityRewardGrant.findUnique({
    where: { businessKey: params.businessKey }
  });
  if (existing) {
    await assertExistingReward(existing, params);
    return existing;
  }
  for (let attempt = 0; ; attempt++) {
    try {
      const grant = await globalPrisma.$transaction(
        async (tx) => {
          const [user, source] = await Promise.all([
            tx.user.findUnique({
              where: { uid: params.recipientUid },
              select: { uid: true, status: true }
            }),
            tx.registrationSource.findUnique({ where: { userUid: params.recipientUid } })
          ]);
          if (!user || user.status !== 'NORMAL_USER' || source?.source === 'API')
            throw new RewardConflictError('Activity recipient is ineligible');
          let amount = rewardAmount(params.type);
          let ruleVersion = ACTIVITY_RULE_VERSION;
          if (params.referralId) {
            const referral = await tx.registrationReferral.findUnique({
              where: { id: params.referralId }
            });
            if (!referral || referral.status === 'INELIGIBLE')
              throw new RewardConflictError('Activity referral is ineligible');
            const expectedUid =
              params.type === ActivityRewardType.REFERRAL_INVITER
                ? referral.inviterUid
                : referral.inviteeUid;
            if (expectedUid !== params.recipientUid)
              throw new RewardConflictError('Activity recipient does not match referral');
            const owner = await tx.activityRewardGrant.findUnique({
              where: { businessKey: firstLoginBusinessKey(referral.inviteeUid) }
            });
            if (
              !owner?.identityKey?.startsWith('v1:') ||
              owner.recipientUid !== referral.inviteeUid
            )
              throw new RewardConflictError('Activity identity owner missing');
            const [inviteeFacts, inviterFacts] = await Promise.all([
              readEligibilityFacts(referral.inviteeUid, tx),
              readEligibilityFacts(referral.inviterUid, tx)
            ]);
            if (
              inviteeFacts.source === 'API' ||
              inviterFacts.identityKeys.some((key) =>
                new Set([...inviteeFacts.identityKeys, owner.identityKey]).has(key)
              )
            )
              throw new RewardConflictError('Activity referral identity conflict');
            amount =
              params.type === ActivityRewardType.REFERRAL_INVITER
                ? referral.inviterRewardAmount
                : referral.inviteeRewardAmount;
            ruleVersion = `${referral.codeId}:${referral.ruleRevision}`;
          } else {
            const facts = await readEligibilityFacts(params.recipientUid, tx);
            if (
              !facts.hasClientLogin ||
              !facts.isRealnameVerified ||
              !params.identityKey ||
              !facts.identityKeys.includes(params.identityKey)
            )
              throw new RewardConflictError('Activity conditions not met');
          }
          if (amount <= 0n)
            throw new RewardConflictError('Zero reward must not enter monetary payout');
          // 资格不能依赖首登礼到账：先保留待到账记录和实名唯一占用，三笔钱独立重试。
          return tx.activityRewardGrant.create({
            data: {
              recipientUid: params.recipientUid,
              type: params.type,
              referralId: params.referralId,
              businessKey: params.businessKey,
              identityKey: params.identityKey,
              amount,
              status: ActivityRewardStatus.READY,
              ruleVersion
            }
          });
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
      );
      return grant;
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        const existing = await globalPrisma.activityRewardGrant.findUnique({
          where: { businessKey: params.businessKey }
        });
        if (existing) {
          await assertExistingReward(existing, params);
          return existing;
        }
        if (params.identityKey) {
          const owner = await globalPrisma.activityRewardGrant.findUnique({
            where: { identityKey: params.identityKey }
          });
          if (owner) return owner;
        }
      }
      if (isRetryableTransactionError(error) && attempt < 4) continue;
      throw error;
    }
  }
};

// An existing first-login row holds an immutable identity snapshot; re-binding
// real-name verification must not let an account claim another identity
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
      status: {
        in: [
          ActivityRewardStatus.REDEEMING,
          ActivityRewardStatus.READY,
          ActivityRewardStatus.RETRYABLE_FAILURE
        ]
      }
    },
    data: { status: ActivityRewardStatus.RETRYABLE_FAILURE, failureReason: reason }
  });

/** Only the wallet, receipt and final paid state share the money transaction. */
const creditDirectGrant = async (grant: ActivityRewardGrant): Promise<void> => {
  const retryable = [ActivityRewardStatus.READY, ActivityRewardStatus.RETRYABLE_FAILURE];
  // 尝试信息独立保存；资金事务回滚后 worker 仍能按原有退避重试。
  for (let attempt = 0; ; attempt++) {
    try {
      await globalPrisma.$transaction(
        async (tx) => {
          const claimed = await tx.activityRewardGrant.updateMany({
            where: {
              id: grant.id,
              status: { in: retryable },
              giftCodeId: null,
              OR: [{ failureReason: null }, { failureReason: { not: { startsWith: 'conflict:' } } }]
            },
            data: {
              status: ActivityRewardStatus.REDEEMING,
              lastAttemptAt: new Date(),
              attemptCount: { increment: 1 }
            }
          });
          if (!claimed.count) return;
          const current = await tx.activityRewardGrant.findUniqueOrThrow({
            where: { id: grant.id }
          });
          const [user, source] = await Promise.all([
            tx.user.findUnique({ where: { uid: current.recipientUid }, select: { status: true } }),
            tx.registrationSource.findUnique({ where: { userUid: current.recipientUid } })
          ]);
          if (
            user?.status !== 'NORMAL_USER' ||
            source?.source === 'API' ||
            current.amount <= 0n ||
            current.accountTransactionId
          )
            throw new RewardConflictError('Activity recipient or intent is ineligible');
          if (current.referralId) {
            const referral = await tx.registrationReferral.findUnique({
              where: { id: current.referralId }
            });
            if (!referral || referral.status === 'INELIGIBLE')
              throw new RewardConflictError('Activity referral is ineligible');
            if (
              current.type !== ActivityRewardType.REFERRAL_INVITER &&
              current.type !== ActivityRewardType.REFERRAL_INVITEE
            )
              throw new RewardConflictError('Activity referral reward type conflicts');
            const inviterSide = current.type === ActivityRewardType.REFERRAL_INVITER;
            if (
              current.businessKey !==
                (inviterSide
                  ? referralInviterBusinessKey(referral.id)
                  : referralInviteeBusinessKey(referral.id)) ||
              current.recipientUid !== (inviterSide ? referral.inviterUid : referral.inviteeUid) ||
              current.amount !==
                (inviterSide ? referral.inviterRewardAmount : referral.inviteeRewardAmount)
            )
              throw new RewardConflictError('Activity reward does not match snapshot');
            const owner = await tx.activityRewardGrant.findUnique({
              where: { businessKey: firstLoginBusinessKey(referral.inviteeUid) }
            });
            const [inviteeFacts, inviterFacts] = await Promise.all([
              readEligibilityFacts(referral.inviteeUid, tx),
              readEligibilityFacts(referral.inviterUid, tx)
            ]);
            if (
              !owner?.identityKey?.startsWith('v1:') ||
              owner.recipientUid !== referral.inviteeUid ||
              inviteeFacts.source === 'API' ||
              inviterFacts.identityKeys.some((key) =>
                new Set([...inviteeFacts.identityKeys, owner.identityKey]).has(key)
              )
            )
              throw new RewardConflictError('Activity referral identity conflict');
          } else if (
            current.type !== ActivityRewardType.DESKTOP_FIRST_LOGIN ||
            current.businessKey !== firstLoginBusinessKey(current.recipientUid) ||
            !current.identityKey?.startsWith('v1:')
          ) {
            throw new RewardConflictError('Activity first-login identity missing');
          }
          await tx.$queryRaw`SELECT "userUid" FROM "Account" WHERE "userUid" = ${current.recipientUid}::UUID FOR UPDATE`;
          const account = await tx.account.findUnique({ where: { userUid: current.recipientUid } });
          if (!account || account.balance === null || account.deduction_balance === null)
            throw new Error('Activity account is not initialized');
          if (account.balance + current.amount > 9223372036854775807n)
            throw new Error('Activity balance overflow');
          const redeemedAt = new Date();
          const transactionId = randomUUID();
          const after = await tx.account.update({
            where: { userUid: current.recipientUid },
            data: { balance: { increment: current.amount }, updated_at: redeemedAt }
          });
          await tx.accountTransaction.create({
            data: {
              id: transactionId,
              type: 'ActivityReward',
              userUid: current.recipientUid,
              billing_id: current.id,
              balance_before: account.balance,
              balance: after.balance!,
              deduction_balance_before: account.deduction_balance,
              deduction_balance: account.deduction_balance,
              message: `activity:${current.type}:${current.businessKey}`
            }
          });
          await tx.activityRewardGrant.update({
            where: { id: current.id },
            data: {
              status: ActivityRewardStatus.REDEEMED,
              redeemedAt,
              accountTransactionId: transactionId,
              failureReason: null
            }
          });
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
      );
      return;
    } catch (error) {
      if (isRetryableTransactionError(error) && attempt < 4) continue;
      // 资金事务回滚后只记录失败；不能在事务前反复写同一行，制造额外的并发冲突。
      try {
        await globalPrisma.activityRewardGrant.updateMany({
          where: { id: grant.id, status: { in: retryable } },
          data: {
            status: ActivityRewardStatus.RETRYABLE_FAILURE,
            failureReason:
              error instanceof RewardConflictError
                ? 'conflict:invalid_direct_reward'
                : 'direct_credit_failed',
            lastAttemptAt: new Date(),
            attemptCount: { increment: 1 }
          }
        });
      } catch (recordError) {
        console.error('Activity direct credit retry metadata failed', {
          grantId: grant.id,
          error: recordError
        });
      }
      console.error('Activity direct credit deferred', { grantId: grant.id, error });
      return;
    }
  }
};

/**
 * Dispatch by the persisted payout method. Direct intents never call billing;
 * legacy gifts claim REDEEMING, redeem the original code and reconcile as before.
 */
export const redeemGrant = async (grant: ActivityRewardGrant): Promise<void> => {
  if (
    grant.status === ActivityRewardStatus.REDEEMED ||
    grant.failureReason?.startsWith('conflict:')
  )
    return;
  if (!grant.giftCodeId) return creditDirectGrant(grant);
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
  if (claimed.count === 0) return; // claimed by another replica or already done

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

    // Body fields match ParseUseGiftCodeReq (code only; identity travels via
    // the Authorization internal token)
    await callBillingService(
      '/account/v1alpha1/gift-code/use',
      { userUid: grant.recipientUid, userId: user.name },
      { code: giftCode.code }
    );

    await markRedeemed(grant.id, new Date());
  } catch (error) {
    console.error('redeemGrant: redeem failed, start reconcile', { grantId: grant.id, error });
    // On failure/timeout, reconcile; a grant must never get stuck in REDEEMING forever
    await reconcileGrant(grant).catch((reconcileError) => {
      console.error('redeemGrant: reconcile failed', { grantId: grant.id, error: reconcileError });
    });
  }
};

/**
 * Reconciliation (on redeem timeout/unknown error): read the GiftCode row and
 * handle three cases:
 * - used ∧ usedBy = recipient → record success retroactively (a lost response
 *   must not cause a double recharge);
 * - used ∧ usedBy ≠ recipient → conflict:used_by_other, stop retrying and
 *   forbid issuing a replacement code;
 * - unused → back to READY, retried by the compensation worker with backoff.
 */
export const reconcileGrant = async (grant: ActivityRewardGrant): Promise<void> => {
  const fresh = await globalPrisma.activityRewardGrant.findUnique({ where: { id: grant.id } });
  if (!fresh || !fresh.giftCodeId || fresh.status === ActivityRewardStatus.REDEEMED) return;

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
    // The conflict: prefix makes the worker skip this grant permanently; log
    // the anomaly for manual investigation
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
      // Redemptions already in flight still need reconciliation; only stop
      // grants not yet claimed
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

/** A wallet failure rolls back only this side; the missing grant remains compensatable. */
const payoutReferralSide = async (params: RewardRequest) => {
  try {
    const reward = await createRewardGrant(params);
    await redeemGrant(reward);
  } catch (error) {
    if (error instanceof RewardConflictError) throw error;
    console.error('Activity referral payout deferred', {
      recipientUid: params.recipientUid,
      type: params.type,
      error
    });
  }
};

/** Backfill both-side referral rewards for the identity owner; no recursion into ancestors. */
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
    // The account was rejected before but has since bound a different
    // legitimate identity; one rejection must not become a permanent account ban
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
  if ((referral.inviteeRewardAmount ?? 5_000_000n) > 0n) {
    await payoutReferralSide({
      recipientUid: userUid,
      type: ActivityRewardType.REFERRAL_INVITEE,
      businessKey: referralInviteeBusinessKey(referral.id),
      referralId: referral.id
    });
  }
  if (
    inviterFacts.source !== RegistrationSourceType.API &&
    (referral.inviterRewardAmount ?? 5_000_000n) > 0n
  ) {
    const inviter = await globalPrisma.user.findUnique({
      where: { uid: referral.inviterUid },
      select: { uid: true }
    });
    if (inviter) {
      await payoutReferralSide({
        recipientUid: referral.inviterUid,
        type: ActivityRewardType.REFERRAL_INVITER,
        businessKey: referralInviterBusinessKey(referral.id),
        referralId: referral.id
      });
    }
  }
};

const grantForEligibleUser = async (userUid: string, facts: EligibilityFacts) => {
  if (facts.source === RegistrationSourceType.API) return;
  const existing = await globalPrisma.activityRewardGrant.findUnique({
    where: { businessKey: firstLoginBusinessKey(userUid) }
  });
  // An existing identity snapshot proves eligibility once held: later changes
  // to the materials must not block backfill of an already-earned referral reward
  if (!existing && (!facts.hasClientLogin || !facts.isRealnameVerified || !facts.identityKey))
    return;
  if (
    existing &&
    (existing.recipientUid !== userUid ||
      existing.type !== ActivityRewardType.DESKTOP_FIRST_LOGIN ||
      existing.referralId)
  )
    throw new RewardConflictError('Activity first-login business key conflict');
  const firstLogin =
    existing ??
    (await createRewardGrant({
      recipientUid: userUid,
      type: ActivityRewardType.DESKTOP_FIRST_LOGIN,
      businessKey: firstLoginBusinessKey(userUid),
      identityKey: facts.identityKey!
    }));
  if (firstLogin.recipientUid !== userUid || !firstLogin.identityKey?.startsWith('v1:')) {
    // Persist the rejection reason so referral backfill stops rescanning
    // duplicate identities; the first-login scan rotation has its own
    // persistent timestamp
    const referral = await globalPrisma.registrationReferral.findUnique({
      where: { inviteeUid: userUid }
    });
    if (referral) await invalidateReferral(referral.id, 'identity_already_claimed');
    return;
  }
  await redeemGrant(firstLogin);
  await grantReferralRewards(userUid, firstLogin, facts);
};

/**
 * The single server-side reward entry point: the identity unique constraint
 * decides account ownership; the business key gives per-item idempotency.
 */
export const checkAndGrantUserRewards = async (userUid: string): Promise<void> => {
  try {
    if (!isActivityAvailable()) return;
    const facts = await readEligibilityFacts(userUid);
    if (facts.source === RegistrationSourceType.API) return;
    await grantForEligibleUser(userUid, facts);
    // Only scan relations that already hold an eligible identity and are
    // missing the referral reward; stale ineligible relations never fill up
    // the batch
    const missing = await takeMissingReferralRewards(userUid);
    for (const referral of missing) {
      try {
        await grantForEligibleUser(
          referral.inviteeUid,
          await readEligibilityFacts(referral.inviteeUid)
        );
      } catch (error) {
        console.error('Activity online referral compensation failed', {
          referralId: referral.id,
          error
        });
      }
    }
  } catch (error) {
    // Reward unavailability must never block login/real-name flows; persisted
    // facts are left for the worker to retry
    console.error('checkAndGrantUserRewards: failed', { userUid, error });
  }
};

// Bounded timeout for request-response paths (e.g. real-name callbacks)
// waiting on reward granting: release the response when the deadline hits.
// Created grants are not rolled back — ones stuck redeeming are reconciled by
// the compensation worker via their lingering REDEEMING status, and uncreated
// ones are backfilled by the missing-reward scan, so a timeout never loses
// a reward.
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
