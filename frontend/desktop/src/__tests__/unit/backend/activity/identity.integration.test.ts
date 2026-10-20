/** Real PG/CRDB regression tests. Only accepts the disposable local activity_test database. */
import { randomUUID } from 'node:crypto';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/services/backend/db/init', async () => {
  const options = {
    datasourceUrl:
      process.env.ACTIVITY_TEST_DATABASE_URL ??
      'postgresql://unused:unused@127.0.0.1:1/activity_test'
  };
  if (process.env.ACTIVITY_TEST_PROVIDER === 'cockroachdb') {
    const { PrismaClient } = await import('prisma/global/generated/client');
    return { globalPrisma: new PrismaClient(options) };
  }
  const { PrismaClient } = await import('prisma/providers/postgresql/global/generated/client');
  return { globalPrisma: new PrismaClient(options) };
});
vi.mock('@/services/enable', () => ({ getVersion: () => 'cn', isActivityAvailable: () => true }));
vi.mock('@/services/backend/auth', () => ({ callBillingService: vi.fn() }));

import { globalPrisma as db } from '@/services/backend/db/init';
import { callBillingService } from '@/services/backend/auth';
import { checkAndGrantUserRewards, redeemGrant } from '@/services/backend/activity/rewards';
import { getActivityStatusData, getInviteRecordList } from '@/services/backend/activity/status';
import { activityRewardJob } from '@/services/backend/activity/worker';

const testUrl = process.env.ACTIVITY_TEST_DATABASE_URL;
if (testUrl) {
  const url = new URL(testUrl);
  if (url.hostname !== '127.0.0.1' || url.pathname !== '/activity_test')
    throw new Error('Refusing non-disposable test database');
}
const suite = testUrl ? describe : describe.skip;
const ID = '11010119900101001X';
const ID2 = '110101199001010028';
const billing = vi.mocked(callBillingService);
const useCode = async (_path: unknown, identity: any, body: any) => {
  await db.giftCode.update({
    where: { code: body.code },
    data: {
      used: true,
      usedBy: identity.userUid,
      usedAt: new Date()
    }
  });
  return {} as any;
};
async function user(identity: string | null = ID, enterprise = false) {
  const uid = randomUUID();
  await db.user.create({ data: { uid, id: uid, name: uid, avatarUri: '', nickname: 'test' } });
  await db.desktopLoginRecord.create({ data: { userUid: uid } });
  if (enterprise)
    await db.enterpriseRealNameInfo.create({
      data: { userUid: uid, isVerified: true, additionalInfo: { key: identity } }
    });
  else
    await db.userRealNameInfo.create({
      data: { userUid: uid, isVerified: true, idCard: identity }
    });
  return uid;
}
async function invite(inviterUid: string, inviteeUid: string) {
  const code = await db.registrationInviteCode.upsert({
    where: { inviterUid },
    create: { inviterUid, code: randomUUID() },
    update: {}
  });
  return db.registrationReferral.create({ data: { inviterUid, inviteeUid, codeId: code.id } });
}
suite('identity rewards against actual database', () => {
  beforeEach(async () => {
    billing.mockReset().mockImplementation(useCode);
    // Explicit disposable DB above; no production fixture or real billing is used.
    for (const table of [
      db.activityRewardGrant,
      db.giftCodeCreation,
      db.giftCode,
      db.registrationReferral,
      db.registrationInviteCode,
      db.registrationSource,
      db.desktopLoginRecord,
      db.userRealNameInfo,
      db.enterpriseRealNameInfo,
      db.user
    ] as any[]) {
      await table.deleteMany();
    }
    global.AppConfig = { cloud: { domain: 'example.test' } } as any;
  });
  afterAll(() => db.$disconnect());

  it.each([false, true])(
    'concurrent accounts with the same subject (enterprise=%s) get one set of awards',
    async (enterprise) => {
      const inviter = await user(null);
      const ids = await Promise.all(
        Array.from({ length: 6 }, () => user(enterprise ? 'EXAMPLE123456789012' : ID, enterprise))
      );
      for (const uid of ids) await invite(inviter, uid);
      await Promise.all(ids.map(checkAndGrantUserRewards));
      // Failed concurrent transactions must leave neither orphan codes nor audits.
      const first = await db.activityRewardGrant.findMany({
        where: { type: 'DESKTOP_FIRST_LOGIN' }
      });
      expect(first).toHaveLength(1);
      expect(await db.activityRewardGrant.count({ where: { type: 'REFERRAL_INVITEE' } })).toBe(1);
      expect(await db.activityRewardGrant.count({ where: { type: 'REFERRAL_INVITER' } })).toBe(1);
      expect(await db.giftCode.count()).toBe(3);
      expect(await db.giftCodeCreation.count()).toBe(3);
      expect(billing).toHaveBeenCalledTimes(3);
      await Promise.all(ids.map(checkAndGrantUserRewards));
      expect(await db.giftCode.count()).toBe(3);
      const denied = ids.find((uid) => uid !== first[0].recipientUid)!;
      const status = await getActivityStatusData(denied);
      expect(status.firstLoginGift.status).toBe('ineligible');
      expect(status.inviteeGift?.status).toBe('ineligible');
      expect((await getActivityStatusData(inviter)).invite.validCount).toBe(1);
      expect(
        (await getInviteRecordList(inviter, 1, 10)).items.filter((r) => r.status === 'ineligible')
      ).toHaveLength(5);
    },
    30000
  );

  it('different subjects can each reward the same inviter without requiring inviter realname', async () => {
    const inviter = await user(null);
    const a = await user(ID),
      b = await user(ID2);
    await invite(inviter, a);
    await invite(inviter, b);
    await checkAndGrantUserRewards(a);
    await checkAndGrantUserRewards(b);
    expect(await db.activityRewardGrant.count()).toBe(6);
    expect((await getActivityStatusData(inviter)).invite.creditedAmount).toBe('10000000');
  });

  it('binds the invitation gift to the first owner even if that account has no referral', async () => {
    const a = await user();
    await checkAndGrantUserRewards(a);
    const inviter = await user(null),
      b = await user();
    await invite(inviter, b);
    await checkAndGrantUserRewards(b);
    await checkAndGrantUserRewards(inviter);
    expect(await db.activityRewardGrant.count()).toBe(1);
    expect((await getActivityStatusData(b)).inviteeGift?.status).toBe('ineligible');
  });

  it('retains identity ownership after account deletion and recreation', async () => {
    const a = await user();
    await checkAndGrantUserRewards(a);
    await db.userRealNameInfo.deleteMany({ where: { userUid: a } });
    await db.desktopLoginRecord.deleteMany({ where: { userUid: a } });
    await db.user.delete({ where: { uid: a } });
    const b = await user();
    await checkAndGrantUserRewards(b);
    expect(await db.activityRewardGrant.count()).toBe(1);
    expect((await getActivityStatusData(b)).firstLoginGift.status).toBe('ineligible');
  });

  it('keeps the first snapshot when an already rewarded account changes realname', async () => {
    const a = await user();
    await checkAndGrantUserRewards(a);
    const before = await db.activityRewardGrant.findFirstOrThrow();
    await db.userRealNameInfo.update({ where: { userUid: a }, data: { idCard: ID2 } });
    await checkAndGrantUserRewards(a);
    const b = await user(ID2);
    await checkAndGrantUserRewards(b);
    const c = await user(ID);
    await checkAndGrantUserRewards(c);
    expect(await db.activityRewardGrant.count()).toBe(2);
    expect(
      (await db.activityRewardGrant.findUniqueOrThrow({ where: { id: before.id } })).identityKey
    ).toBe(before.identityKey);
  });

  it('requires subject evidence and excludes API registration', async () => {
    const missing = await user(null),
      api = await user();
    await db.registrationSource.create({ data: { userUid: api, source: 'API' } });
    await checkAndGrantUserRewards(missing);
    await checkAndGrantUserRewards(api);
    expect(await db.activityRewardGrant.count()).toBe(0);
  });

  it('reconciles a lost billing response without issuing another code', async () => {
    billing.mockImplementationOnce(async (...args) => {
      await useCode(...args);
      throw new Error('response lost');
    });
    const a = await user();
    await checkAndGrantUserRewards(a);
    await checkAndGrantUserRewards(a);
    expect((await db.activityRewardGrant.findFirstOrThrow()).status).toBe('REDEEMED');
    expect(await db.giftCode.count()).toBe(1);
    expect(billing).toHaveBeenCalledTimes(1);
  });

  it('retains the claim during billing failure and retries the original code', async () => {
    billing.mockRejectedValueOnce(new Error('billing unavailable'));
    const a = await user();
    await checkAndGrantUserRewards(a);
    const grant = await db.activityRewardGrant.findFirstOrThrow();
    expect(grant.status).toBe('READY');
    const b = await user();
    await checkAndGrantUserRewards(b);
    expect(await db.giftCode.count()).toBe(1);
    await redeemGrant(grant);
    expect(await db.giftCode.count()).toBe(1);
    expect((await db.activityRewardGrant.findFirstOrThrow()).status).toBe('REDEEMED');
  });

  it('does not award known same-subject self invitations', async () => {
    const inviter = await user(),
      invitee = await user();
    await invite(inviter, invitee);
    await checkAndGrantUserRewards(invitee);
    expect(await db.activityRewardGrant.count()).toBe(1);
    expect((await db.registrationReferral.findFirstOrThrow()).ineligibleReason).toBe(
      'self_identity'
    );
  });

  it('checks every verified subject for self invitations, including enterprise on a personal account', async () => {
    const inviter = await user(ID2);
    await db.enterpriseRealNameInfo.create({
      data: { userUid: inviter, isVerified: true, additionalInfo: { key: 'EXAMPLE123456789012' } }
    });
    const invitee = await user('EXAMPLE123456789012', true);
    await invite(inviter, invitee);
    await checkAndGrantUserRewards(invitee);
    expect(await db.activityRewardGrant.count()).toBe(1);
    expect((await db.registrationReferral.findFirstOrThrow()).status).toBe('INELIGIBLE');
  });

  it('stops pending invitation gifts after a relationship is found to share a verified subject', async () => {
    const inviter = await user(null),
      invitee = await user();
    const referral = await invite(inviter, invitee);
    billing.mockRejectedValue(new Error('billing unavailable'));
    await checkAndGrantUserRewards(invitee);
    expect(await db.activityRewardGrant.count()).toBe(3);
    await db.userRealNameInfo.update({ where: { userUid: inviter }, data: { idCard: ID } });
    await checkAndGrantUserRewards(invitee);
    expect(
      (await db.registrationReferral.findUniqueOrThrow({ where: { id: referral.id } })).status
    ).toBe('INELIGIBLE');
    billing.mockReset().mockImplementation(useCode);
    const pending = await db.activityRewardGrant.findMany({ where: { referralId: referral.id } });
    for (const grant of pending) await redeemGrant(grant);
    expect(billing).not.toHaveBeenCalled();
  });

  it('does not restart permanent conflicts from a stale grant snapshot', async () => {
    const a = await user();
    billing.mockRejectedValueOnce(new Error('billing unavailable'));
    await checkAndGrantUserRewards(a);
    const stale = await db.activityRewardGrant.findFirstOrThrow();
    await db.activityRewardGrant.update({
      where: { id: stale.id },
      data: { status: 'RETRYABLE_FAILURE', failureReason: 'conflict:used_by_other' }
    });
    billing.mockClear();
    await redeemGrant(stale);
    expect(billing).not.toHaveBeenCalled();
  });

  it('rechecks known self identity during worker retries even without a user status poll', async () => {
    const inviter = await user(null),
      invitee = await user();
    const relation = await invite(inviter, invitee);
    billing.mockRejectedValue(new Error('billing unavailable'));
    await checkAndGrantUserRewards(invitee);
    await db.userRealNameInfo.update({ where: { userUid: inviter }, data: { idCard: ID } });
    const pending = await db.activityRewardGrant.findMany({ where: { referralId: relation.id } });
    billing.mockReset().mockImplementation(useCode);
    for (const grant of pending) await redeemGrant(grant);
    expect(billing).not.toHaveBeenCalled();
    expect(
      (await db.registrationReferral.findUniqueOrThrow({ where: { id: relation.id } })).status
    ).toBe('INELIGIBLE');
  });

  it('rebuilds an old missing invitation behind twenty verified records with no subject evidence', async () => {
    const inviter = await user(null),
      valid = await user();
    await checkAndGrantUserRewards(valid);
    const old = await invite(inviter, valid);
    await db.registrationReferral.update({
      where: { id: old.id },
      data: { registeredAt: new Date('2026-10-13') }
    });
    for (let i = 0; i < 20; i++) {
      const newer = await invite(inviter, await user(null));
      await db.registrationReferral.update({
        where: { id: newer.id },
        data: { registeredAt: new Date('2026-10-14') }
      });
    }
    await activityRewardJob();
    expect(await db.activityRewardGrant.count({ where: { referralId: old.id } })).toBe(2);
  }, 30000);
});
