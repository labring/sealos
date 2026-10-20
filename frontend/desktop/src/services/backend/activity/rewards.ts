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
import { isUniqueConstraintError } from './registration';
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
  // false = existing row hit via unique key (concurrent duplicate = already granted)
  created: boolean;
};

/**
 * Creates the reward row + activity gift code + creation audit in one
 * global-db transaction: the GiftCode is created first and the grant carries
 * its giftCodeId; the businessKey unique constraint provides idempotency.
 */
const createRewardGrant = async (params: {
  recipientUid: string;
  type: ActivityRewardType;
  businessKey: string;
  referralId?: string;
  identityKey?: string;
}): Promise<CreateRewardGrantResult> => {
  // Serve status polling from the existing row; without this pre-check, every
  // poll would create a gift code and roll it back
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
          // Activity gift codes carry no beneficiary field (decided 2026-10-14):
          // anti-sniping relies on keeping the 24-char random code secret, never
          // sending it to the client, and redeeming it as the beneficiary
          // immediately after creation
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
              // Audit records the beneficiary: a system-created activity code,
              // not something disguised as a manual recharge
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
        // Unique-constraint conflict: businessKey / giftCodeId / random code
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
        // On a random-code collision, retry with a fresh code; the failed
        // transaction leaves no orphaned code
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
  // An existing identity snapshot proves eligibility once held: later changes
  // to the materials must not block backfill of an already-earned referral reward
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
