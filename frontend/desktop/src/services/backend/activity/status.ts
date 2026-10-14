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
import { isActivityAvailable, readEligibilityFacts } from './rewards';

// 首登礼展示状态（金额为 credit 单位字符串，客户端按 1¥=1e6 展示）
export type FirstLoginGiftStatus = {
  status: 'ineligible' | 'pending_realname' | 'processing' | 'credited';
  amount: string;
  creditedAt?: string;
};

// 受邀礼展示状态：本人经邀请链接注册才有（无邀请关系返回 null，客户端整行隐藏）
export type InviteeGiftStatus = {
  status: 'pending_realname' | 'processing' | 'credited';
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

const FIRST_LOGIN_AMOUNT_STRING = FIRST_LOGIN_REWARD_AMOUNT.toString(); // ¥10，credit 单位，单一来源
const INVITEE_AMOUNT_STRING = REFERRAL_REWARD_AMOUNT.toString(); // ¥5，credit 单位

/**
 * 活动状态汇总（activity/status 路由的 data）：
 * 调用前应已先跑 checkAndGrantUserRewards（老用户补领），这里只读不写。
 */
export const getActivityStatusData = async (userUid: string): Promise<ActivityStatusData> => {
  const available = isActivityAvailable();
  const facts = await readEligibilityFacts(userUid);

  let firstLoginGift: FirstLoginGiftStatus;
  if (!available || facts.source === RegistrationSourceType.API) {
    // 国际部署 / API 注册账号不参与
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
    } else if (grant) {
      // 条件曾满足、发放中（含暂态失败重试）
      firstLoginGift = { status: 'processing', amount: grant.amount.toString() };
    } else if (!facts.hasClientLogin) {
      // 无客户端登录记录：条件推进中（登录客户端后自动发放）
      firstLoginGift = { status: 'processing', amount: FIRST_LOGIN_AMOUNT_STRING };
    } else if (!facts.isRealnameVerified) {
      firstLoginGift = { status: 'pending_realname', amount: FIRST_LOGIN_AMOUNT_STRING };
    } else {
      firstLoginGift = { status: 'processing', amount: FIRST_LOGIN_AMOUNT_STRING };
    }
  }

  // 受邀礼：本人作为受邀人的 ¥5（有邀请关系才展示；条件同首登礼，独立记账）
  let inviteeGift: InviteeGiftStatus | null = null;
  if (available && facts.source !== RegistrationSourceType.API) {
    const referral = await globalPrisma.registrationReferral.findUnique({
      where: { inviteeUid: userUid },
      select: { id: true }
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
      } else if (grant) {
        inviteeGift = { status: 'processing', amount: grant.amount.toString() };
      } else if (!facts.isRealnameVerified && facts.hasClientLogin) {
        inviteeGift = { status: 'pending_realname', amount: INVITEE_AMOUNT_STRING };
      } else {
        // 条件推进中（客户端登录/实名任一未齐都显示为进行中，客户端打开即已上报登录事实）
        inviteeGift = { status: 'processing', amount: INVITEE_AMOUNT_STRING };
      }
    }
  }

  // invite 摘要：无 code 时不生成只返回空字段——code 由显式 ensure 接口创建
  const [inviteCode, referrals, creditedGrants] = await Promise.all([
    available
      ? globalPrisma.registrationInviteCode.findUnique({ where: { inviterUid: userUid } })
      : Promise.resolve(null),
    globalPrisma.registrationReferral.findMany({
      where: { inviterUid: userUid },
      select: { id: true, inviteeUid: true }
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

  // validCount = 受邀人已满足条件数（受邀人奖励行已存在即条件曾满足）
  let validCount = 0;
  for (const referral of referrals) {
    const inviteeGrant = await globalPrisma.activityRewardGrant.findUnique({
      where: { businessKey: referralInviteeBusinessKey(referral.id) },
      select: { id: true }
    });
    if (inviteeGrant) validCount += 1;
  }

  const creditedAmount = creditedGrants.reduce((sum, grant) => sum + grant.amount, 0n);

  // API 注册账号与发奖/建码资格检查同一判定：邀请区不返回 code/inviteUrl，
  // 客户端整块隐藏分享入口，避免「页面承诺双方奖励、发奖永久跳过」的状态错位。
  const inviteIneligible = !available || facts.source === RegistrationSourceType.API;
  const invite: InviteSummary = {
    code: inviteIneligible ? null : inviteCode?.code ?? null,
    inviteUrl: inviteIneligible ? null : inviteCode ? buildInviteUrl(inviteCode.code) : null,
    registeredCount: referrals.length,
    validCount,
    creditedAmount: creditedAmount.toString()
  };

  return { available, firstLoginGift, inviteeGift, invite };
};

/**
 * 分页邀请记录（activity/invite/records 路由的 data）：
 * 只查 inviterUid = 本人，join invitee User 取脱敏昵称，不含 uid/手机号/实名材料。
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

    // 状态推导：无登录→pending_client_login；有登录无实名→pending_realname；
    // 条件齐未到账→processing；到账→credited；API 来源（本期不会出现）→ineligible
    let status: InviteRecordStatus;
    if (inviteeFacts.source === RegistrationSourceType.API) {
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
