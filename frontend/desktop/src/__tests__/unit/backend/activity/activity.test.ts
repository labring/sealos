import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Replace the prisma singleton wholesale with an assertable stub; no real DB connection
vi.mock('@/services/backend/db/init', () => ({
  globalPrisma: {
    activityRewardIdentityConfig: { findUnique: vi.fn() },
    $queryRaw: vi.fn(),
    registrationSource: { findUnique: vi.fn(), create: vi.fn() },
    userRealNameInfo: { findUnique: vi.fn() },
    enterpriseRealNameInfo: { findUnique: vi.fn() },
    desktopLoginRecord: { findUnique: vi.fn() },
    registrationInviteCode: { findUnique: vi.fn(), create: vi.fn() },
    registrationReferral: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      updateMany: vi.fn()
    },
    user: { findUnique: vi.fn() },
    giftCode: { findUnique: vi.fn(), create: vi.fn() },
    giftCodeCreation: { create: vi.fn() },
    activityRewardGrant: {
      findUnique: vi.fn(),
      create: vi.fn(),
      updateMany: vi.fn(),
      findMany: vi.fn()
    },
    $transaction: vi.fn()
  }
}));

// Activity switches read global.AppConfig; pin it to the CN version for unit tests
vi.mock('@/services/enable', () => ({ getVersion: vi.fn(() => 'cn') }));

// Redemption goes through the internal billing service; intercept it to assert no double redemption
vi.mock('@/services/backend/auth', () => ({ callBillingService: vi.fn() }));

import { Prisma } from 'prisma/global/generated/client';
import { Prisma as PostgresqlPrisma } from 'prisma/providers/postgresql/global/generated/client';
import { globalPrisma } from '@/services/backend/db/init';
import { callBillingService } from '@/services/backend/auth';
import {
  checkAndGrantUserRewards,
  readEligibilityFacts
} from '@/services/backend/activity/rewards';
import { getActivityStatusData } from '@/services/backend/activity/status';
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
    vi.resetAllMocks();
    (globalPrisma.activityRewardIdentityConfig.findUnique as any).mockResolvedValue({
      pepper: 'a'.repeat(64)
    });
    (globalPrisma.$queryRaw as any).mockResolvedValue([]);
  });

  it('treats users without a RegistrationSource row as WEB (历史用户可领)', async () => {
    (globalPrisma.registrationSource.findUnique as any).mockResolvedValue(null);
    (globalPrisma.userRealNameInfo.findUnique as any).mockResolvedValue({
      isVerified: true,
      idCard: '11010119900101001X'
    });
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
    (globalPrisma.enterpriseRealNameInfo.findUnique as any).mockResolvedValue({
      isVerified: true,
      additionalInfo: { key: 'EXAMPLE123456789012' }
    });
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
      (globalPrisma.userRealNameInfo.findUnique as any).mockResolvedValue({
        isVerified: true,
        idCard: '11010119900101001X'
      });
      (globalPrisma.enterpriseRealNameInfo.findUnique as any).mockResolvedValue(null);
      (globalPrisma.desktopLoginRecord.findUnique as any).mockResolvedValue({ userUid: USER_UID });
      // First-login gift transaction hits the businessKey unique constraint → already granted
      (globalPrisma.$transaction as any).mockRejectedValue(p2002(ErrorClass));
      (globalPrisma.activityRewardGrant.findUnique as any)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
        .mockResolvedValue({
          id: 'existing-grant',
          recipientUid: USER_UID,
          identityKey: 'v1:owned',
          businessKey: firstLoginBusinessKey(USER_UID),
          status: 'REDEEMED'
        });
      (globalPrisma.registrationReferral.findUnique as any).mockResolvedValue(null);
      (globalPrisma.registrationReferral.findMany as any).mockResolvedValue([]);

      await checkAndGrantUserRewards(USER_UID);

      expect(globalPrisma.activityRewardGrant.findUnique).toHaveBeenCalledWith({
        where: { businessKey: firstLoginBusinessKey(USER_UID) }
      });
      expect(globalPrisma.$transaction).toHaveBeenCalledTimes(1);
      // The existing row does not re-claim redemption (retries belong to the
      // compensation worker's backoff)
      expect(globalPrisma.activityRewardGrant.updateMany).not.toHaveBeenCalled();
      expect(callBillingService).not.toHaveBeenCalled();
    }
  );

  it('grants the inviter after the invitee already owns the first-login identity', async () => {
    const inviteeUid = '00000000-0000-4000-8000-000000000003';
    (globalPrisma.registrationSource.findUnique as any).mockResolvedValue({ source: 'WEB' });
    (globalPrisma.userRealNameInfo.findUnique as any).mockImplementation(async ({ where }: any) =>
      where.userUid === inviteeUid ? { isVerified: true, idCard: '11010119900101001X' } : null
    );
    (globalPrisma.desktopLoginRecord.findUnique as any).mockResolvedValue({ userUid: inviteeUid });
    (globalPrisma.registrationReferral.findUnique as any).mockResolvedValue({
      id: REFERRAL_ID,
      inviteeUid,
      inviterUid: USER_UID,
      status: 'PENDING'
    });
    (globalPrisma.$queryRaw as any).mockResolvedValue([{ inviteeUid }]);
    (globalPrisma.activityRewardGrant.findUnique as any).mockImplementation(
      async ({ where }: any) => {
        if (where.businessKey === firstLoginBusinessKey(inviteeUid))
          return {
            id: 'first',
            recipientUid: inviteeUid,
            identityKey: 'v1:owned',
            status: 'REDEEMED'
          };
        if (where.businessKey?.startsWith('REFERRAL_INVITEE:'))
          return { id: 'invitee', status: 'REDEEMED' };
        return null;
      }
    );
    (globalPrisma.$transaction as any).mockImplementation(async (callback: any) =>
      callback(globalPrisma)
    );
    (globalPrisma.giftCode.create as any).mockResolvedValue({ id: 'code' });
    (globalPrisma.activityRewardGrant.create as any).mockImplementation(async ({ data }: any) => ({
      ...data,
      id: 'grant'
    }));
    (globalPrisma.activityRewardGrant.updateMany as any).mockResolvedValue({ count: 1 });
    (globalPrisma.giftCode.findUnique as any).mockResolvedValue({ code: 'private-gift-code' });
    (globalPrisma.user.findUnique as any).mockResolvedValue({ uid: USER_UID, name: 'inviter' });

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
    expect(callBillingService).toHaveBeenCalledTimes(1);
  });

  it('does not grant anything for API-registered users', async () => {
    (globalPrisma.registrationSource.findUnique as any).mockResolvedValue({ source: 'API' });
    (globalPrisma.userRealNameInfo.findUnique as any).mockResolvedValue({
      isVerified: true,
      idCard: '11010119900101001X'
    });
    (globalPrisma.desktopLoginRecord.findUnique as any).mockResolvedValue({ userUid: USER_UID });

    await checkAndGrantUserRewards(USER_UID);

    expect(globalPrisma.$transaction).not.toHaveBeenCalled();
    expect(globalPrisma.registrationReferral.findMany).not.toHaveBeenCalled();
  });
});

describe('activity status presentation', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubGlobal('AppConfig', { cloud: { domain: 'bja.sealos.run' } });
    (globalPrisma.activityRewardIdentityConfig.findUnique as any).mockResolvedValue({
      pepper: 'a'.repeat(64)
    });
    (globalPrisma.$queryRaw as any).mockResolvedValue([]);
  });

  afterEach(() => vi.unstubAllGlobals());

  it('returns the official website link for an existing invitation code', async () => {
    (globalPrisma.registrationSource.findUnique as any).mockResolvedValue({ source: 'WEB' });
    (globalPrisma.userRealNameInfo.findUnique as any).mockResolvedValue(null);
    (globalPrisma.enterpriseRealNameInfo.findUnique as any).mockResolvedValue(null);
    (globalPrisma.desktopLoginRecord.findUnique as any).mockResolvedValue(null);
    (globalPrisma.registrationInviteCode.findUnique as any).mockResolvedValue({ code: 'ABCD2345' });
    (globalPrisma.registrationReferral.findMany as any).mockResolvedValue([]);
    (globalPrisma.activityRewardGrant.findMany as any).mockResolvedValue([]);

    const data = await getActivityStatusData(USER_UID);

    expect(data.available).toBe(true);
    expect(data.invite.code).toBe('ABCD2345');
    expect(data.invite.inviteUrl).toBe('https://sealos.run/invite/ABCD2345');
  });

  it('hides the invite share entry for API-registered accounts', async () => {
    (globalPrisma.registrationSource.findUnique as any).mockResolvedValue({ source: 'API' });
    (globalPrisma.userRealNameInfo.findUnique as any).mockResolvedValue({
      isVerified: true,
      idCard: '11010119900101001X'
    });
    (globalPrisma.enterpriseRealNameInfo.findUnique as any).mockResolvedValue(null);
    (globalPrisma.desktopLoginRecord.findUnique as any).mockResolvedValue({ userUid: USER_UID });
    // Even if legacy data already has an invite code, API accounts must not get a
    // shareable link: rewards permanently skip API inviters, and the page must not
    // promise rewards to both sides.
    (globalPrisma.registrationInviteCode.findUnique as any).mockResolvedValue({ code: 'ABCDEFGH' });
    (globalPrisma.registrationReferral.findMany as any).mockResolvedValue([]);
    (globalPrisma.activityRewardGrant.findMany as any).mockResolvedValue([]);

    const data = await getActivityStatusData(USER_UID);

    expect(data.available).toBe(false);
    expect(data.invite.code).toBeNull();
    expect(data.invite.inviteUrl).toBeNull();
    expect(data.firstLoginGift.status).toBe('ineligible');
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
        .mockResolvedValueOnce(null) // pre-check: no code yet
        .mockResolvedValueOnce(existing); // re-read after conflict: created concurrently
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
