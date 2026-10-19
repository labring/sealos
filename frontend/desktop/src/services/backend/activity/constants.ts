import { ActivityRewardType } from 'prisma/global/generated/client';

// Invite context cookie: lives on the desktop cloud domain, so the OAuth
// round-trip stays same-origin and cannot lose it. Written once (never
// overwritten); the first valid link wins.
export const INVITE_COOKIE_NAME = 'sealos_invite';
export const INVITE_COOKIE_MAX_AGE = 30 * 24 * 60 * 60; // 30 days, in seconds

// Money unit follows existing accounting: 1 CNY = 1,000,000 (deFormatMoney, src/utils/format.ts)
export const FIRST_LOGIN_REWARD_AMOUNT = 10_000_000n; // ¥10
export const REFERRAL_REWARD_AMOUNT = 5_000_000n; // ¥5

// Rule version is audit-only; it plays no part in eligibility checks
export const ACTIVITY_RULE_VERSION = '2026-10-15.1';

// Invite codes: 8 chars from an unambiguous alphabet (no 0/O/1/I/L);
// collisions are retried via the unique constraint
export const INVITE_CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export const INVITE_CODE_LENGTH = 8;

// Activity gift codes follow the existing 24-char random-string style, same unambiguous alphabet
export const GIFT_CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export const GIFT_CODE_LENGTH = 24;

// The businessKey unique constraint gives idempotency: one reward per business key
export const firstLoginBusinessKey = (userUid: string) => `DESKTOP_FIRST_LOGIN:${userUid}` as const;
export const referralInviterBusinessKey = (referralId: string) =>
  `REFERRAL_INVITER:${referralId}` as const;
export const referralInviteeBusinessKey = (referralId: string) =>
  `REFERRAL_INVITEE:${referralId}` as const;

export const rewardAmount = (type: ActivityRewardType): bigint => {
  switch (type) {
    case ActivityRewardType.DESKTOP_FIRST_LOGIN:
      return FIRST_LOGIN_REWARD_AMOUNT;
    case ActivityRewardType.REFERRAL_INVITER:
    case ActivityRewardType.REFERRAL_INVITEE:
      return REFERRAL_REWARD_AMOUNT;
  }
};

// GiftCode.comment audit marker: marks codes the system created for the beneficiary
export const activityGiftCodeComment = (type: ActivityRewardType, businessKey: string) =>
  `activity:${type}:${businessKey}`;

// Share the public website landing page in every deployment. The website carries
// the code to the console /signin entry; clients pass this URL through unchanged.
export const buildInviteUrl = (code: string) =>
  `https://sealos.run/invite/${encodeURIComponent(code)}`;
