import { globalPrisma } from '@/services/backend/db/init';
import { ActivityRewardStatus, Prisma } from 'prisma/global/generated/client';
import { checkAndGrantUserRewards, reconcileGrant, redeemGrant } from './rewards';
import { isActivityAvailable } from '@/services/enable';

// Per-run cap so large tables cannot stall the cron cycle
const BATCH_LIMIT = 50;
// A grant stuck in REDEEMING past this window is treated as an interrupted
// redemption: reconcile first, then record success or roll back
const REDEEMING_STUCK_MS = 5 * 60 * 1000;
const retryBackoffMs = (attemptCount: number) =>
  Math.min(2 ** attemptCount * 60 * 1000, 30 * 60 * 1000);

/**
 * Activity reward compensation worker (invoked by croner every 60s; lazily
 * registered from getAppConfig):
 * 1. Reconcile grants stuck in REDEEMING for over 5 minutes (record success /
 *    stop retrying on conflict / roll back to READY);
 * 2. Retry redemption of READY / RETRYABLE_FAILURE grants once backoff elapses
 *    (conflict:* is skipped permanently);
 * 3. Rebuild missing first-login rewards from persisted login facts, covering
 *    direct sign-ups without a referral and legacy users;
 * 4. Scan referrals whose conditions are met but whose reward rows are missing
 *    (fallback for a broken invitee-side trigger chain, so rewards still land
 *    when the inviter is offline or the process crashed). checkAndGrantUserRewards
 *    is itself idempotent.
 * Multi-replica safety relies on redeemGrant's conditional-update claim; errors
 * are logged only and never rethrown to the cron.
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

    // PostgreSQL ASC defaults to NULLS LAST: a batch of old, repeatedly failed
    // rows (lastAttemptAt set) would consume the whole cap and starve
    // never-attempted READY grants (lastAttemptAt NULL). Split into two queries:
    // never-attempted grants go first, backoff retries get their own batch.
    const retryFilter: Prisma.ActivityRewardGrantWhereInput = {
      status: { in: [ActivityRewardStatus.READY, ActivityRewardStatus.RETRYABLE_FAILURE] },
      // Exclude permanent conflicts before limiting so stopped grants cannot
      // monopolize the batch; READY grants with a NULL reason are kept.
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
      // conflict:* failures are permanent: never retried, never issued a new code
      if (grant.failureReason?.startsWith('conflict:')) continue;
      // Skip until the backoff elapses (attemptCount is incremented on claim in redeemGrant)
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

    // The two scans compensate independently: either query failing must not
    // block the other class of users this round.
    await scanMissingFirstLoginRewards().catch((error) => {
      console.error('[activityRewardJob] scan missing first-login rewards failed', { error });
    });
    await scanMissingReferralRewards();
  } catch (error) {
    console.error('[activityRewardJob] error:', error);
  }
};

type MissingGrantReferral = {
  id: string;
  inviteeUid: string;
};

// If the first-login reward transaction failed there is no grant row yet, so
// recovery must scan persisted login facts rather than referrals alone.
// Filter out API-sourced, unverified and deleted accounts first so ineligible
// records cannot fill the compensation batch.
const MISSING_FIRST_LOGIN_REWARDS_SQL = Prisma.sql`
  SELECT d."userUid"
  FROM "DesktopLoginRecord" d
  JOIN "User" u ON u."uid" = d."userUid"
  WHERE (
      EXISTS (SELECT 1 FROM "UserRealNameInfo" p
              WHERE p."userUid" = d."userUid" AND p."isVerified" = true)
      OR EXISTS (SELECT 1 FROM "EnterpriseRealNameInfo" e
                 WHERE e."userUid" = d."userUid" AND e."isVerified" = true)
    )
    AND NOT EXISTS (
      SELECT 1 FROM "RegistrationSource" s
      WHERE s."userUid" = d."userUid" AND s."source" = 'API')
    AND NOT EXISTS (
      SELECT 1 FROM "ActivityRewardGrant" g
      WHERE g."recipientUid" = d."userUid" AND g."type" = 'DESKTOP_FIRST_LOGIN')
  ORDER BY d."rewardCheckedAt" ASC NULLS FIRST, d."userUid" ASC
  LIMIT 20
`;

const scanMissingFirstLoginRewards = async () => {
  const users: { userUid: string }[] = await globalPrisma.$queryRaw(
    MISSING_FIRST_LOGIN_REWARDS_SQL
  );
  for (const { userUid } of users) {
    // Advance the rotation even when no identity key was obtained or it is held
    // by another account, so records cannot pin the LIMIT forever.
    await globalPrisma.desktopLoginRecord.updateMany({
      where: { userUid },
      data: { rewardCheckedAt: new Date() }
    });
    await checkAndGrantUserRewards(userUid).catch((error) => {
      console.error('[activityRewardJob] rebuild missing first-login rewards failed', {
        userUid,
        error
      });
    });
  }
};

// The invitee's first-login ownership proof (identityKey) once succeeded.
// Records without one rotate through the first-login scan and must not fill
// the referral batch. API-sourced or deleted inviters get no inviter reward
// rebuilt, but an eligible invitee reward still can be.
const MISSING_REFERRAL_REWARDS_SQL = Prisma.sql`
  SELECT r."id", r."inviteeUid"
  FROM "RegistrationReferral" r
  JOIN "ActivityRewardGrant" owner ON owner."businessKey" = 'DESKTOP_FIRST_LOGIN:' || r."inviteeUid"::TEXT
  WHERE r."status" != 'INELIGIBLE' AND owner."identityKey" LIKE 'v1:%'
    AND NOT EXISTS (
      SELECT 1 FROM "RegistrationSource" s
      WHERE s."userUid" = r."inviteeUid" AND s."source" = 'API')
    AND (
      (EXISTS (SELECT 1 FROM "User" u WHERE u."uid" = r."inviterUid")
       AND NOT EXISTS (SELECT 1 FROM "RegistrationSource" s WHERE s."userUid" = r."inviterUid" AND s."source" = 'API')
       AND NOT EXISTS (SELECT 1 FROM "ActivityRewardGrant" g
                  WHERE g."referralId" = r."id" AND g."type" = 'REFERRAL_INVITER'))
      OR NOT EXISTS (SELECT 1 FROM "ActivityRewardGrant" g
                     WHERE g."referralId" = r."id" AND g."type" = 'REFERRAL_INVITEE')
    )
  ORDER BY r."registeredAt" DESC
  LIMIT 20
`;

/**
 * Missing-reward scan: run checkAndGrantUserRewards (idempotent) once as the
 * invitee, covering the invitee's first-login and invitee rewards and directly
 * rebuilding the inviter's. Every hit is self-healing — once rebuilt the
 * referral no longer matches the scan; during payment outages it keeps
 * matching and is drained by the backoff of the retry path above.
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
