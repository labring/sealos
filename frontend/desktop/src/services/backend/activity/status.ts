import { globalPrisma } from '@/services/backend/db/init';
import {
  ActivityRewardStatus,
  ActivityRewardType,
  RegistrationSourceType
} from 'prisma/global/generated/client';
import { maskNickname } from './codes';
import {
  buildInviteUrl,
  FIRST_LOGIN_REWARD_AMOUNT,
  firstLoginBusinessKey,
  referralInviteeBusinessKey,
  referralInviterBusinessKey,
  REFERRAL_REWARD_AMOUNT
} from './constants';
import { readEligibilityFacts, hasIdentityConflict } from './rewards';
import { isActivityAvailable } from '@/services/enable';

// First-login gift display status (amounts are credit-unit strings; the client
// renders 1 CNY = 1e6)
export type FirstLoginGiftStatus = {
  status: 'ineligible' | 'pending_realname' | 'processing' | 'credited';
  amount: string;
  creditedAt?: string;
};

// Invitee gift display status: exists only when the user registered via an invite
// link (null when there is no referral; the client hides the whole row)
export type InviteeGiftStatus = {
  status: 'ineligible' | 'pending_realname' | 'processing' | 'credited';
  amount: string;
  creditedAt?: string;
};

export type InviteSummary = {
  code: string | null;
  inviteUrl: string | null;
  registeredCount: number;
  validCount: number;
  creditedAmount: string;
};

export type ActivityStatusData = {
  available: boolean;
  firstLoginGift: FirstLoginGiftStatus;
  inviteeGift: InviteeGiftStatus | null;
  invite: InviteSummary;
};

export type InviteRecordStatus =
  | 'pending_client_login'
  | 'pending_realname'
  | 'processing'
  | 'credited'
  | 'ineligible';

export type InviteRecordItem = {
  invitee: string;
  registeredAt: string;
  status: InviteRecordStatus;
};

const FIRST_LOGIN_AMOUNT_STRING = FIRST_LOGIN_REWARD_AMOUNT.toString(); // ¥10 in credit units, single source of truth
const INVITEE_AMOUNT_STRING = REFERRAL_REWARD_AMOUNT.toString(); // ¥5 in credit units

/**
 * Activity status summary (the `data` of the activity/status route).
 * Callers must run checkAndGrantUserRewards first (covers catch-up grants for
 * existing users); this function is read-only.
 */
export const getActivityStatusData = async (userUid: string): Promise<ActivityStatusData> => {
  const facts = await readEligibilityFacts(userUid);
  // An empty invite link reads to the client as "not generated yet" and cannot
  // express ineligibility, so the whole activity entry is closed instead.
  const available = isActivityAvailable() && facts.source !== RegistrationSourceType.API;

  const identityConflict = available && (await hasIdentityConflict(userUid, facts));
  let firstLoginGift: FirstLoginGiftStatus;
  if (!available || facts.source === RegistrationSourceType.API) {
    firstLoginGift = { status: 'ineligible', amount: FIRST_LOGIN_AMOUNT_STRING };
  } else {
    const grant = await globalPrisma.activityRewardGrant.findUnique({
      where: { businessKey: firstLoginBusinessKey(userUid) }
    });
    if (grant?.status === ActivityRewardStatus.REDEEMED) {
      firstLoginGift = {
        status: 'credited',
        amount: grant.amount.toString(),
        creditedAt: grant.redeemedAt?.toISOString()
      };
    } else if (identityConflict) {
      firstLoginGift = { status: 'ineligible', amount: FIRST_LOGIN_AMOUNT_STRING };
    } else if (grant) {
      // Conditions were met; payout in progress (incl. retry after transient failures)
      firstLoginGift = { status: 'processing', amount: grant.amount.toString() };
    } else if (!facts.hasClientLogin) {
      // Still progressing; granted automatically once the user logs in on the desktop client
      firstLoginGift = { status: 'processing', amount: FIRST_LOGIN_AMOUNT_STRING };
    } else if (!facts.isRealnameVerified) {
      firstLoginGift = { status: 'pending_realname', amount: FIRST_LOGIN_AMOUNT_STRING };
    } else {
      firstLoginGift = { status: 'processing', amount: FIRST_LOGIN_AMOUNT_STRING };
    }
  }

  // Invitee gift: the ¥5 for being invited (only shown when a referral exists; same
  // conditions as the first-login gift, accounted independently)
  let inviteeGift: InviteeGiftStatus | null = null;
  if (available && facts.source !== RegistrationSourceType.API) {
    const referral = await globalPrisma.registrationReferral.findUnique({
      where: { inviteeUid: userUid },
      select: { id: true, status: true }
    });
    if (referral) {
      const grant = await globalPrisma.activityRewardGrant.findUnique({
        where: { businessKey: referralInviteeBusinessKey(referral.id) }
      });
      if (grant?.status === ActivityRewardStatus.REDEEMED) {
        inviteeGift = {
          status: 'credited',
          amount: grant.amount.toString(),
          creditedAt: grant.redeemedAt?.toISOString()
        };
      } else if (identityConflict || referral.status === 'INELIGIBLE') {
        inviteeGift = { status: 'ineligible', amount: INVITEE_AMOUNT_STRING };
      } else if (grant) {
        inviteeGift = { status: 'processing', amount: grant.amount.toString() };
      } else if (!facts.isRealnameVerified && facts.hasClientLogin) {
        inviteeGift = { status: 'pending_realname', amount: INVITEE_AMOUNT_STRING };
      } else {
        // Processing while either client login or realname verification is missing;
        // opening the client already reports the login fact
        inviteeGift = { status: 'processing', amount: INVITEE_AMOUNT_STRING };
      }
    }
  }

  // Invite summary: without a code, return empty fields instead of creating one —
  // codes are created by the explicit ensure endpoint
  const [inviteCode, referrals, creditedGrants] = await Promise.all([
    available
      ? globalPrisma.registrationInviteCode.findUnique({ where: { inviterUid: userUid } })
      : Promise.resolve(null),
    globalPrisma.registrationReferral.findMany({
      where: { inviterUid: userUid },
      select: { id: true, inviteeUid: true, status: true }
    }),
    globalPrisma.activityRewardGrant.findMany({
      where: {
        recipientUid: userUid,
        type: ActivityRewardType.REFERRAL_INVITER,
        status: ActivityRewardStatus.REDEEMED
      },
      select: { amount: true }
    })
  ]);

  // validCount = invitees who met the conditions (an existing invitee grant row
  // means the conditions were once met)
  let validCount = 0;
  for (const referral of referrals) {
    const inviteeGrant = await globalPrisma.activityRewardGrant.findUnique({
      where: { businessKey: referralInviteeBusinessKey(referral.id) },
      select: { id: true }
    });
    if (inviteeGrant && referral.status !== 'INELIGIBLE') validCount += 1;
  }

  const creditedAmount = creditedGrants.reduce((sum, grant) => sum + grant.amount, 0n);

  // Same eligibility rule as the reward/code checks: for API-registered accounts the
  // invite section returns no code/inviteUrl and the client hides the share entry
  // entirely, avoiding a state mismatch where the page promises both-side rewards
  // that are never granted.
  const invite: InviteSummary = {
    code: available ? inviteCode?.code ?? null : null,
    inviteUrl: available && inviteCode ? buildInviteUrl(inviteCode.code) : null,
    registeredCount: referrals.length,
    validCount,
    creditedAmount: creditedAmount.toString()
  };

  return { available, firstLoginGift, inviteeGift, invite };
};

/**
 * Paginated invite records (the `data` of the activity/invite/records route).
 * Queries only inviterUid = self and joins the invitee User for a masked nickname;
 * never returns uid / phone / realname materials.
 */
export const getInviteRecordList = async (userUid: string, page: number, pageSize: number) => {
  const [total, referrals] = await Promise.all([
    globalPrisma.registrationReferral.count({ where: { inviterUid: userUid } }),
    globalPrisma.registrationReferral.findMany({
      where: { inviterUid: userUid },
      orderBy: { registeredAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize
    })
  ]);

  const items: InviteRecordItem[] = [];
  for (const referral of referrals) {
    const [inviteeUser, inviteeFacts, inviterGrant] = await Promise.all([
      globalPrisma.user.findUnique({
        where: { uid: referral.inviteeUid },
        select: { nickname: true }
      }),
      readEligibilityFacts(referral.inviteeUid),
      globalPrisma.activityRewardGrant.findUnique({
        where: { businessKey: referralInviterBusinessKey(referral.id) },
        select: { status: true }
      })
    ]);

    // API-source invitees cannot occur in this phase; still handled defensively as
    // 'ineligible'
    let status: InviteRecordStatus;
    if (
      inviteeFacts.source === RegistrationSourceType.API ||
      referral.status === 'INELIGIBLE' ||
      (await hasIdentityConflict(referral.inviteeUid, inviteeFacts))
    ) {
      status = 'ineligible';
    } else if (!inviteeFacts.hasClientLogin) {
      status = 'pending_client_login';
    } else if (!inviteeFacts.isRealnameVerified) {
      status = 'pending_realname';
    } else if (inviterGrant?.status === ActivityRewardStatus.REDEEMED) {
      status = 'credited';
    } else {
      status = 'processing';
    }

    items.push({
      invitee: maskNickname(inviteeUser?.nickname),
      registeredAt: referral.registeredAt.toISOString(),
      status
    });
  }

  return {
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
    items
  };
};
