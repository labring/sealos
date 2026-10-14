import { beforeEach, describe, expect, it, vi } from 'vitest';

// prisma 单例整体替换为可断言的桩，避免真实连库
vi.mock('@/services/backend/db/init', () => ({
  globalPrisma: {
    registrationSource: { findUnique: vi.fn(), create: vi.fn() },
    userRealNameInfo: { findUnique: vi.fn() },
    enterpriseRealNameInfo: { findUnique: vi.fn() },
    desktopLoginRecord: { findUnique: vi.fn() },
    registrationInviteCode: { findUnique: vi.fn(), create: vi.fn() },
    registrationReferral: { findUnique: vi.fn(), findMany: vi.fn(), create: vi.fn() },
    user: { findUnique: vi.fn() },
    giftCode: { findUnique: vi.fn(), create: vi.fn() },
    giftCodeCreation: { create: vi.fn() },
    activityRewardGrant: { findUnique: vi.fn(), create: vi.fn(), updateMany: vi.fn() },
    $transaction: vi.fn()
  }
}));

// 活动开关读 global.AppConfig，单测环境直接固定为国内版本
vi.mock('@/services/enable', () => ({ getVersion: vi.fn(() => 'cn') }));

// 核销走内部账务服务，单测里拦截以便断言「不重复核销」
vi.mock('@/services/backend/auth', () => ({ callBillingService: vi.fn() }));

import { Prisma } from 'prisma/global/generated/client';
import { Prisma as PostgresqlPrisma } from 'prisma/providers/postgresql/global/generated/client';
import { globalPrisma } from '@/services/backend/db/init';
import { callBillingService } from '@/services/backend/auth';
import {
  checkAndGrantUserRewards,
  readEligibilityFacts
} from '@/services/backend/activity/rewards';
import {
  attachRegistrationInTransaction,
  ensureInviteCode
} from '@/services/backend/activity/registration';
import { maskNickname } from '@/services/backend/activity/codes';
import {
  firstLoginBusinessKey,
  referralInviterBusinessKey
} from '@/services/backend/activity/constants';

const p2002 = (ErrorClass = Prisma.PrismaClientKnownRequestError) =>
  new ErrorClass('Unique constraint failed on the fields: (`businessKey`)', {
    code: 'P2002',
    clientVersion: '5.10.2'
  });

const prismaProviders = [
  ['CockroachDB', Prisma.PrismaClientKnownRequestError],
  ['PostgreSQL', PostgresqlPrisma.PrismaClientKnownRequestError]
] as const;

const USER_UID = '00000000-0000-4000-8000-000000000001';
const REFERRAL_ID = '00000000-0000-4000-8000-000000000002';

describe('activity rewards eligibility', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('treats users without a RegistrationSource row as WEB (历史用户可领)', async () => {
    (globalPrisma.registrationSource.findUnique as any).mockResolvedValue(null);
    (globalPrisma.userRealNameInfo.findUnique as any).mockResolvedValue({ isVerified: true });
    (globalPrisma.enterpriseRealNameInfo.findUnique as any).mockResolvedValue(null);
    (globalPrisma.desktopLoginRecord.findUnique as any).mockResolvedValue({ userUid: USER_UID });

    const facts = await readEligibilityFacts(USER_UID);

    expect(facts.source).toBe('WEB');
    expect(facts.isRealnameVerified).toBe(true);
    expect(facts.hasClientLogin).toBe(true);
  });

  it('accepts enterprise realname and detects API source', async () => {
    (globalPrisma.registrationSource.findUnique as any).mockResolvedValue({ source: 'API' });
    (globalPrisma.userRealNameInfo.findUnique as any).mockResolvedValue(null);
    (globalPrisma.enterpriseRealNameInfo.findUnique as any).mockResolvedValue({ isVerified: true });
    (globalPrisma.desktopLoginRecord.findUnique as any).mockResolvedValue(null);

    const facts = await readEligibilityFacts(USER_UID);

    expect(facts.source).toBe('API');
    expect(facts.isRealnameVerified).toBe(true);
    expect(facts.hasClientLogin).toBe(false);
  });

  it.each(prismaProviders)(
    '%s: treats businessKey conflicts as already granted without redeeming again',
    async (_provider, ErrorClass) => {
      (globalPrisma.registrationSource.findUnique as any).mockResolvedValue(null);
      (globalPrisma.userRealNameInfo.findUnique as any).mockResolvedValue({ isVerified: true });
      (globalPrisma.enterpriseRealNameInfo.findUnique as any).mockResolvedValue(null);
      (globalPrisma.desktopLoginRecord.findUnique as any).mockResolvedValue({ userUid: USER_UID });
      // 首登礼事务撞 businessKey 唯一约束 → 视为已发放
      (globalPrisma.$transaction as any).mockRejectedValue(p2002(ErrorClass));
      (globalPrisma.activityRewardGrant.findUnique as any).mockResolvedValue({
        id: 'existing-grant',
        businessKey: firstLoginBusinessKey(USER_UID),
        status: 'REDEEMED'
      });
      (globalPrisma.registrationReferral.findUnique as any).mockResolvedValue(null);
      (globalPrisma.registrationReferral.findMany as any).mockResolvedValue([]);

      await checkAndGrantUserRewards(USER_UID);

      expect(globalPrisma.activityRewardGrant.findUnique).toHaveBeenCalledWith({
        where: { businessKey: firstLoginBusinessKey(USER_UID) }
      });
      // 既有行不再抢占核销（重试交给补偿 worker 的退避逻辑）
      expect(globalPrisma.activityRewardGrant.updateMany).not.toHaveBeenCalled();
      expect(callBillingService).not.toHaveBeenCalled();
    }
  );

  it('grants the inviter reward on PostgreSQL after the first-login gift was already granted', async () => {
    (globalPrisma.registrationSource.findUnique as any).mockResolvedValue({ source: 'WEB' });
    (globalPrisma.userRealNameInfo.findUnique as any).mockResolvedValue({ isVerified: true });
    (globalPrisma.enterpriseRealNameInfo.findUnique as any).mockResolvedValue(null);
    (globalPrisma.desktopLoginRecord.findUnique as any).mockResolvedValue({ userUid: USER_UID });
    (globalPrisma.registrationReferral.findUnique as any).mockResolvedValue(null);
    (globalPrisma.registrationReferral.findMany as any).mockResolvedValue([
      { id: REFERRAL_ID, inviteeUid: '00000000-0000-4000-8000-000000000003' }
    ]);
    (globalPrisma.$transaction as any)
      .mockReset()
      .mockRejectedValueOnce(p2002(PostgresqlPrisma.PrismaClientKnownRequestError))
      .mockImplementationOnce(async (callback: any) => callback(globalPrisma));
    (globalPrisma.activityRewardGrant.findUnique as any).mockResolvedValue({
      id: 'first-login-grant',
      businessKey: firstLoginBusinessKey(USER_UID),
      status: 'REDEEMED'
    });
    (globalPrisma.giftCode.create as any).mockResolvedValue({ id: 'inviter-gift-code' });
    (globalPrisma.activityRewardGrant.create as any).mockImplementation(async ({ data }: any) => ({
      ...data,
      id: 'inviter-grant'
    }));
    (globalPrisma.activityRewardGrant.updateMany as any).mockResolvedValue({ count: 1 });
    (globalPrisma.giftCode.findUnique as any).mockResolvedValue({ code: 'private-gift-code' });
    (globalPrisma.user.findUnique as any).mockResolvedValue({ name: 'inviter' });

    await checkAndGrantUserRewards(USER_UID);

    expect(globalPrisma.activityRewardGrant.create).toHaveBeenCalledExactlyOnceWith({
      data: expect.objectContaining({
        recipientUid: USER_UID,
        type: 'REFERRAL_INVITER',
        referralId: REFERRAL_ID,
        businessKey: referralInviterBusinessKey(REFERRAL_ID),
        amount: 5_000_000n
      })
    });
    expect(callBillingService).toHaveBeenCalledExactlyOnceWith(
      '/account/v1alpha1/gift-code/use',
      { userUid: USER_UID, userId: 'inviter' },
      { code: 'private-gift-code' }
    );
  });

  it('does not grant anything for API-registered users', async () => {
    (globalPrisma.registrationSource.findUnique as any).mockResolvedValue({ source: 'API' });
    (globalPrisma.userRealNameInfo.findUnique as any).mockResolvedValue({ isVerified: true });
    (globalPrisma.desktopLoginRecord.findUnique as any).mockResolvedValue({ userUid: USER_UID });

    await checkAndGrantUserRewards(USER_UID);

    expect(globalPrisma.$transaction).not.toHaveBeenCalled();
    expect(globalPrisma.registrationReferral.findMany).not.toHaveBeenCalled();
  });
});

describe('registration attribution', () => {
  const makeTx = () => ({
    registrationSource: { create: vi.fn() },
    registrationInviteCode: { findUnique: vi.fn() },
    user: { findUnique: vi.fn() },
    registrationReferral: { create: vi.fn() }
  });

  it('creates the source row even without an invite code', async () => {
    const tx = makeTx();
    await attachRegistrationInTransaction(tx as any, USER_UID, { source: 'API' });

    expect(tx.registrationSource.create).toHaveBeenCalledWith({
      data: { userUid: USER_UID, source: 'API' }
    });
    expect(tx.registrationReferral.create).not.toHaveBeenCalled();
  });

  it('skips referral silently when the invite code is unknown (注册不被阻断)', async () => {
    const tx = makeTx();
    tx.registrationInviteCode.findUnique.mockResolvedValue(null);

    await attachRegistrationInTransaction(tx as any, USER_UID, {
      source: 'WEB',
      inviteCode: 'NOPE99999'
    });

    expect(tx.registrationReferral.create).not.toHaveBeenCalled();
  });

  it('defends against self referral and missing inviter', async () => {
    const tx = makeTx();
    tx.registrationInviteCode.findUnique.mockResolvedValue({
      id: 'code-id',
      inviterUid: USER_UID,
      enabled: true
    });

    await attachRegistrationInTransaction(tx as any, USER_UID, {
      source: 'WEB',
      inviteCode: 'ABC23456'
    });

    expect(tx.registrationReferral.create).not.toHaveBeenCalled();
  });

  it('creates the referral row for a valid invite code', async () => {
    const tx = makeTx();
    const inviterUid = '00000000-0000-4000-8000-000000000003';
    tx.registrationInviteCode.findUnique.mockResolvedValue({
      id: 'code-id',
      inviterUid,
      enabled: true
    });
    tx.user.findUnique.mockResolvedValue({ uid: inviterUid });

    await attachRegistrationInTransaction(tx as any, USER_UID, {
      source: 'WEB',
      inviteCode: 'ABC23456'
    });

    expect(tx.registrationReferral.create).toHaveBeenCalledWith({
      data: {
        inviteeUid: USER_UID,
        inviterUid,
        codeId: 'code-id'
      }
    });
  });

  it.each(prismaProviders)(
    '%s: ensureInviteCode reuses the existing row on unique conflict',
    async (_provider, ErrorClass) => {
      const existing = { id: 'row', inviterUid: USER_UID, code: 'ABC23456' };
      (globalPrisma.registrationInviteCode.findUnique as any)
        .mockResolvedValueOnce(null) // 预检：没有码
        .mockResolvedValueOnce(existing); // 冲突后重读：并发已创建
      (globalPrisma.registrationInviteCode.create as any).mockRejectedValue(p2002(ErrorClass));

      const code = await ensureInviteCode(USER_UID);

      expect(code).toBe(existing);
    }
  );
});

describe('presentation helpers', () => {
  it('masks nicknames without leaking full identity', () => {
    expect(maskNickname('张三丰')).toBe('张***');
    expect(maskNickname('  ')).toBe('Sealos 用户');
    expect(maskNickname(null)).toBe('Sealos 用户');
  });
});
