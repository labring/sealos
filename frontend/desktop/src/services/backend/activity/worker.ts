import { globalPrisma } from '@/services/backend/db/init';
import { ActivityRewardStatus, Prisma } from 'prisma/global/generated/client';
import { checkAndGrantUserRewards, reconcileGrant, redeemGrant } from './rewards';
import { isActivityAvailable } from '@/services/enable';
import { takeMissingReferralRewards } from './referral-scan';

// Per-run cap so large tables cannot stall the cron cycle
const BATCH_LIMIT = 50;
// A grant stuck in REDEEMING past this window is treated as an interrupted
// redemption: reconcile first, then record success or roll back
const REDEEMING_STUCK_MS = 5 * 60 * 1000;
const FIRST_LOGIN_SCAN_WRITE_ATTEMPTS = 3;
const FIRST_LOGIN_SCAN_BATCH_LIMIT = 20;
const FIRST_LOGIN_SCAN_COOLDOWN = Prisma.sql`INTERVAL '60 seconds'`;
// Allow timestamp rounding and small clock differences between DB nodes.
const FIRST_LOGIN_SCAN_CLOCK_TOLERANCE = Prisma.sql`INTERVAL '1 second'`;
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

// If the first-login reward transaction failed there is no grant row yet, so
// recovery must scan persisted login facts rather than referrals alone.
// Filter out API-sourced, unverified and deleted accounts first so ineligible
// records cannot fill the compensation batch.
type FirstLoginScanCandidate = { userUid: string; rewardCheckedAt: Date | null };

const FIRST_LOGIN_SCAN_ELIGIBILITY_SQL = Prisma.sql`
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
`;

const FIRST_LOGIN_SCAN_DUE_SQL = Prisma.sql`(d."rewardCheckedAt" IS NULL
  OR d."rewardCheckedAt" <= (CURRENT_TIMESTAMP AT TIME ZONE 'UTC') - ${FIRST_LOGIN_SCAN_COOLDOWN})`;
const FIRST_LOGIN_SCAN_FUTURE_SQL = Prisma.sql`d."rewardCheckedAt" >
  (CURRENT_TIMESTAMP AT TIME ZONE 'UTC') + ${FIRST_LOGIN_SCAN_CLOCK_TOLERANCE}`;

// Old workers stamped cursors using app time. Recover future cursors first so
// they cannot sit behind an endless rotation of ordinary candidates. Each range
// keeps its indexed ordering; the final sort sees at most two bounded batches.
const MISSING_FIRST_LOGIN_REWARDS_SQL = Prisma.sql`
  SELECT "userUid", "rewardCheckedAt"
  FROM (
    (
      SELECT d."userUid", d."rewardCheckedAt", 0 AS priority
      ${FIRST_LOGIN_SCAN_ELIGIBILITY_SQL}
      AND ${FIRST_LOGIN_SCAN_FUTURE_SQL}
      ORDER BY d."rewardCheckedAt" ASC, d."userUid" ASC
      LIMIT ${FIRST_LOGIN_SCAN_BATCH_LIMIT}
    )
    UNION ALL
    (
      SELECT d."userUid", d."rewardCheckedAt", 1 AS priority
      ${FIRST_LOGIN_SCAN_ELIGIBILITY_SQL}
      AND ${FIRST_LOGIN_SCAN_DUE_SQL}
      ORDER BY d."rewardCheckedAt" ASC NULLS FIRST, d."userUid" ASC
      LIMIT ${FIRST_LOGIN_SCAN_BATCH_LIMIT}
    )
  ) candidates
  ORDER BY priority ASC, "rewardCheckedAt" ASC NULLS FIRST, "userUid" ASC
  LIMIT ${FIRST_LOGIN_SCAN_BATCH_LIMIT}
`;

// Claim the exact scan snapshot before dispatch. Database time keeps the cooldown
// consistent across regions; a competing claim or deleted row is a normal skip.
// Retry only the claim, never reward redemption or billing calls.
const advanceFirstLoginScan = async ({
  userUid,
  rewardCheckedAt
}: FirstLoginScanCandidate): Promise<boolean> => {
  for (let attempts = 1; ; attempts++) {
    try {
      const updated = await globalPrisma.$executeRaw(Prisma.sql`
        UPDATE "DesktopLoginRecord" AS d
        SET "rewardCheckedAt" = (CURRENT_TIMESTAMP AT TIME ZONE 'UTC'),
            "updatedAt" = (CURRENT_TIMESTAMP AT TIME ZONE 'UTC')
        WHERE d."userUid" = ${userUid}::UUID
          AND d."rewardCheckedAt" IS NOT DISTINCT FROM ${rewardCheckedAt}::TIMESTAMP
          AND (${FIRST_LOGIN_SCAN_DUE_SQL} OR ${FIRST_LOGIN_SCAN_FUTURE_SQL})
      `);
      return updated === 1;
    } catch (error) {
      const requestError =
        error && typeof error === 'object'
          ? (error as { code?: unknown; meta?: { code?: unknown } })
          : undefined;
      const code = requestError?.code;
      // Raw SQL exposes serialization failures / deadlocks through P2010.
      const retryable =
        code === 'P2034' ||
        (code === 'P2010' &&
          (requestError?.meta?.code === '40001' || requestError?.meta?.code === '40P01'));
      if (!retryable || attempts >= FIRST_LOGIN_SCAN_WRITE_ATTEMPTS) {
        console.error('[activityRewardJob] advance first-login scan failed', {
          userUid,
          code,
          attempts,
          error
        });
        return false;
      }
      // 100–200ms, then 200–400ms; jitter separates competing replicas.
      const baseDelayMs = 100 * 2 ** (attempts - 1);
      await new Promise<void>((resolve) =>
        setTimeout(resolve, baseDelayMs + Math.floor(Math.random() * baseDelayMs))
      );
    }
  }
};

const scanMissingFirstLoginRewards = async () => {
  const users = await globalPrisma.$queryRaw<FirstLoginScanCandidate[]>(
    MISSING_FIRST_LOGIN_REWARDS_SQL
  );
  for (const candidate of users) {
    const { userUid } = candidate;
    // Advance the rotation even when no identity key was obtained or it is held
    // by another account, so records cannot pin the LIMIT forever.
    // A failed row remains eligible next round without blocking the batch.
    if (!(await advanceFirstLoginScan(candidate))) continue;
    await checkAndGrantUserRewards(userUid).catch((error) => {
      console.error('[activityRewardJob] rebuild missing first-login rewards failed', {
        userUid,
        error
      });
    });
  }
};

// Advance durable scan rotation before any payout attempt.
const scanMissingReferralRewards = async () => {
  const referrals = await takeMissingReferralRewards();
  for (const referral of referrals) {
    await checkAndGrantUserRewards(referral.inviteeUid).catch((error) => {
      console.error('[activityRewardJob] rebuild missing referral rewards failed', {
        referralId: referral.id,
        error
      });
    });
  }
};
