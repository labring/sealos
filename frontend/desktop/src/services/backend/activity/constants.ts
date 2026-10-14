import { ActivityRewardType } from 'prisma/global/generated/client';

// 邀请上下文 cookie：落在 desktop 云端域名上，OAuth 往返同域不丢失。
// 只写一次（已存在则不覆盖），首次有效链接优先。
export const INVITE_COOKIE_NAME = 'sealos_invite';
export const INVITE_COOKIE_MAX_AGE = 30 * 24 * 60 * 60; // 30 天，秒

// 金额单位沿用现有账务：1¥ = 1,000,000（src/utils/format.ts 的 deFormatMoney）
export const FIRST_LOGIN_REWARD_AMOUNT = 10_000_000n; // ¥10
export const REFERRAL_REWARD_AMOUNT = 5_000_000n; // ¥5

// 规则版本仅审计用，不参与资格判定
export const ACTIVITY_RULE_VERSION = '2026-10-14.1';

// 邀请码 8 位，去混淆字母表（无 0/O/1/I/L），冲突靠唯一约束重试
export const INVITE_CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export const INVITE_CODE_LENGTH = 8;

// 活动奖励码沿用现有 24 位随机字符串风格，同样去混淆
export const GIFT_CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export const GIFT_CODE_LENGTH = 24;

// businessKey 唯一约束即幂等：每种奖励每业务键一次
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

// GiftCode.comment 审计标记：明确是系统为受益人创建的活动码
export const activityGiftCodeComment = (type: ActivityRewardType, businessKey: string) =>
  `activity:${type}:${businessKey}`;

// 官网 #299 的邀请页上线前，统一返回可独立使用的控制台注册链接。
// 官网部署验收后再切换此处；客户端始终透传服务端 URL。
export const buildInviteUrl = (code: string) =>
  `https://${global.AppConfig.cloud.domain}/signin?invite=${encodeURIComponent(code)}`;
