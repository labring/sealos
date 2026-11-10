import { isActivityAvailable } from '@/services/enable';
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
import { isUniqueConstraintError, type TransactionClient } from './registration';
import { rewardIdentityKeys } from './identity.cjs';

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
    throw new Error('Activity business key conflicts with reward recipient');
  if (params.referralId) {
    const referral = await globalPrisma.registrationReferral.findUnique({
      where: { id: params.referralId }
    });
    const expected =
      params.type === ActivityRewardType.REFERRAL_INVITER
        ? referral?.inviterRewardAmount
        : referral?.inviteeRewardAmount;
    if (!referral || expected !== grant.amount)
      throw new Error('Activity business key conflicts with reward snapshot');
  }
};

type CreateRewardGrantResult = {
  grant: ActivityRewardGrant;
  // false = existing row hit via unique key (concurrent duplicate = already granted)
  created: boolean;
};

/** Compatibility phase: retain legacy gift-code writes until all readers support direct grants. */
const createRewardGrant = async (params: RewardRequest): Promise<CreateRewardGrantResult> => {
  const existing = await globalPrisma.activityRewardGrant.findUnique({
    where: { businessKey: params.businessKey }
  });
  if (existing) {
    await assertExistingReward(existing, params);
    return { grant: existing, created: false };
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
            throw new Error('Activity recipient is ineligible');
          let amount = rewardAmount(params.type);
          let ruleVersion = ACTIVITY_RULE_VERSION;
          if (params.referralId) {
            const referral = await tx.registrationReferral.findUnique({
              where: { id: params.referralId }
            });
            if (!referral || referral.status === 'INELIGIBLE')
              throw new Error('Activity referral is ineligible');
            const expectedUid =
              params.type === ActivityRewardType.REFERRAL_INVITER
                ? referral.inviterUid
                : referral.inviteeUid;
            if (expectedUid !== params.recipientUid)
              throw new Error('Activity recipient does not match referral');
            const owner = await tx.activityRewardGrant.findUnique({
              where: { businessKey: firstLoginBusinessKey(referral.inviteeUid) }
            });
            if (
              !owner?.identityKey?.startsWith('v1:') ||
              owner.recipientUid !== referral.inviteeUid
            )
              throw new Error('Activity identity owner missing');
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
              throw new Error('Activity referral identity conflict');
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
              throw new Error('Activity conditions not met');
          }
          if (amount <= 0n) throw new Error('Zero reward must not enter monetary payout');
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
              createdByUserUid: params.recipientUid,
              rechargeType: RechargeCodeType.ACTIVITY_RECHARGE
            }
          });
          return tx.activityRewardGrant.create({
            data: {
              recipientUid: params.recipientUid,
              type: params.type,
              referralId: params.referralId,
              businessKey: params.businessKey,
              identityKey: params.identityKey,
              amount,
              giftCodeId: giftCode.id,
              status: ActivityRewardStatus.READY,
              ruleVersion
            }
          });
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
      );
      return { grant, created: true };
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        const existing = await globalPrisma.activityRewardGrant.findUnique({
          where: { businessKey: params.businessKey }
        });
        if (existing) {
          await assertExistingReward(existing, params);
          return { grant: existing, created: false };
        }
        if (params.identityKey) {
          const owner = await globalPrisma.activityRewardGrant.findUnique({
            where: { identityKey: params.identityKey }
          });
          if (owner) return { grant: owner, created: false };
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
      status: { in: [ActivityRewardStatus.REDEEMING, ActivityRewardStatus.READY] }
    },
    data: { status: ActivityRewardStatus.RETRYABLE_FAILURE, failureReason: reason }
  });

/**
 * Auto redemption: claim via conditional update (READY/RETRYABLE_FAILURE →
 * REDEEMING, safe across multiple replicas), call billing as the beneficiary
 * (internal billing JWT), then mark REDEEMED on success.
 */
export const redeemGrant = async (grant: ActivityRewardGrant): Promise<void> => {
  if (
    !grant.giftCodeId ||
    grant.status === ActivityRewardStatus.REDEEMED ||
    grant.failureReason?.startsWith('conflict:')
  )
    return;
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
    const invitee = await createRewardGrant({
      recipientUid: userUid,
      type: ActivityRewardType.REFERRAL_INVITEE,
      businessKey: referralInviteeBusinessKey(referral.id),
      referralId: referral.id
    });
    if (invitee.created) await redeemGrant(invitee.grant);
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
    throw new Error('Activity first-login business key conflict');
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
    // Persist the rejection reason so referral backfill stops rescanning
    // duplicate identities; the first-login scan rotation has its own
    // persistent timestamp
    const referral = await globalPrisma.registrationReferral.findUnique({
      where: { inviteeUid: userUid }
    });
    if (referral) await invalidateReferral(referral.id, 'identity_already_claimed');
    return;
  }
  if (firstLogin.created) await redeemGrant(firstLogin.grant);
  await grantReferralRewards(userUid, firstLogin.grant, facts);
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
    const missing: { inviteeUid: string }[] = await globalPrisma.$queryRaw(Prisma.sql`
      SELECT r."inviteeUid" FROM "RegistrationReferral" r
      JOIN "ActivityRewardGrant" owner ON owner."businessKey" = 'DESKTOP_FIRST_LOGIN:' || r."inviteeUid"::TEXT
      WHERE r."inviterUid" = ${userUid}::UUID AND r."status" != 'INELIGIBLE'
        AND owner."identityKey" LIKE 'v1:%'
        AND r."inviterRewardAmount" > 0
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
