/** Exercises registered-account activation and actual money against a disposable local database. */
import { randomUUID, createHash } from 'node:crypto';
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
vi.mock('@/services/enable', () => ({ isActivityAvailable: () => true }));
vi.mock('@/services/backend/auth', () => ({ callBillingService: vi.fn() }));

import { globalPrisma as db } from '@/services/backend/db/init';
import { checkAndGrantUserRewards } from '@/services/backend/activity/rewards';
import { getActivityStatusData, getInviteRecordList } from '@/services/backend/activity/status';
import { attachRegistrationInTransaction } from '@/services/backend/activity/registration';
import { callBillingService } from '@/services/backend/auth';
import { previewKolActivation, activateKol } from '@/services/backend/activity/kol';

const testUrl = process.env.ACTIVITY_TEST_DATABASE_URL;
if (testUrl) {
  const url = new URL(testUrl);
  if (url.hostname !== '127.0.0.1' || url.pathname !== '/activity_test')
    throw new Error('Refusing non-disposable test database');
}
const suite = testUrl ? describe : describe.skip;
const CODE = 'A'.repeat(32);
async function wallet(uid: string) {
  await db.account.create({
    data: {
      userUid: uid,
      balance: 100_000_000n,
      deduction_balance: 7_000_000n,
      activityBonus: 0n,
      encryptBalance: '',
      encryptDeductionBalance: '',
      create_region_id: randomUUID()
    }
  });
}
async function eligible(identity: string) {
  const uid = await user();
  await wallet(uid);
  await db.desktopLoginRecord.create({ data: { userUid: uid } });
  await db.userRealNameInfo.create({ data: { userUid: uid, isVerified: true, idCard: identity } });
  return uid;
}
async function activation(ownerUid: string, code = CODE) {
  return db.kolActivationCode.create({
    data: {
      codeHash: createHash('sha256').update(code).digest('hex'),
      inviterRewardAmount: 10_000_000n,
      inviteeRewardAmount: 0n,
      createdByUid: ownerUid
    }
  });
}
async function user() {
  const uid = randomUUID();
  await db.user.create({ data: { uid, id: uid, name: uid, nickname: 'test', avatarUri: '' } });
  return uid;
}
suite('KOL activation against actual database', () => {
  beforeEach(async () => {
    vi.mocked(callBillingService).mockReset();
    for (const table of [
      db.activityRewardGrant,
      db.giftCodeCreation,
      db.giftCode,
      db.accountTransaction,
      db.account,
      db.kolActivationCode,
      db.eventLog,
      db.registrationReferral,
      db.registrationInviteCode,
      db.registrationSource,
      db.desktopLoginRecord,
      db.userRealNameInfo,
      db.user
    ] as Array<{ deleteMany: () => Promise<unknown> }>)
      await table.deleteMany();
  });
  afterAll(() => db.$disconnect());

  it('previews without consuming and upgrades the registered user existing code exactly once', async () => {
    const uid = await user();
    const row = await db.registrationInviteCode.create({
      data: { inviterUid: uid, code: 'ABC23456' }
    });
    await db.kolActivationCode.create({
      data: {
        codeHash: createHash('sha256').update(CODE).digest('hex'),
        inviterRewardAmount: 10_000_000n,
        inviteeRewardAmount: 0n,
        createdByUid: uid
      }
    });
    const preview = await previewKolActivation(uid, CODE);
    expect(preview.inviterRewardAmount).toBe('10000000');
    expect(await db.kolActivationCode.count({ where: { status: 'ACTIVATED' } })).toBe(0);
    await activateKol(uid, {
      code: CODE,
      ruleRevision: preview.ruleRevision,
      expectedUserUid: uid
    });
    await activateKol(uid, {
      code: CODE,
      ruleRevision: preview.ruleRevision,
      expectedUserUid: uid
    });
    const actual = await db.registrationInviteCode.findUniqueOrThrow({
      where: { inviterUid: uid }
    });
    expect(actual.id).toBe(row.id);
    expect(actual.code).toBe('ABC23456');
    expect(actual.inviterRewardAmount).toBe(10_000_000n);
    expect(actual.inviteeRewardAmount).toBe(0n);
    expect(await db.kolActivationCode.count({ where: { activatedByUid: uid } })).toBe(1);
    expect(await db.account.count()).toBe(0);
    expect(await db.activityRewardGrant.count()).toBe(0);
  });
  it('claims one activation for only one registered account under concurrent requests', async () => {
    const a = await user(),
      b = await user();
    await activation(a);
    const results = await Promise.allSettled(
      [a, b].map((uid) => activateKol(uid, { code: CODE, ruleRevision: 1, expectedUserUid: uid }))
    );
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(await db.registrationInviteCode.count()).toBe(1);
    expect(await db.kolActivationCode.count({ where: { status: 'ACTIVATED' } })).toBe(1);
  });

  it('does not restore old rules on retry and does not consume a second code', async () => {
    const uid = await user();
    await activation(uid);
    const second = 'B'.repeat(32);
    await activation(uid, second);
    await activateKol(uid, { code: CODE, ruleRevision: 1, expectedUserUid: uid });
    await db.registrationInviteCode.update({
      where: { inviterUid: uid },
      data: { inviterRewardAmount: 20_000_000n, ruleRevision: { increment: 1 }, enabled: false }
    });
    await activateKol(uid, { code: CODE, ruleRevision: 1, expectedUserUid: uid });
    await expect(
      activateKol(uid, { code: second, ruleRevision: 1, expectedUserUid: uid })
    ).rejects.toThrow('already_activated');
    const own = await db.registrationInviteCode.findUniqueOrThrow({ where: { inviterUid: uid } });
    expect(own.inviterRewardAmount).toBe(20_000_000n);
    expect(own.enabled).toBe(false);
    expect(
      (
        await db.kolActivationCode.findUniqueOrThrow({
          where: { codeHash: createHash('sha256').update(second).digest('hex') }
        })
      ).status
    ).toBe('UNUSED');
  });

  it('rejects API accounts, revoked codes, wrong account and stale rule revisions without consumption', async () => {
    const uid = await user();
    const code = await activation(uid);
    await expect(
      activateKol(uid, { code: CODE, ruleRevision: 1, expectedUserUid: randomUUID() })
    ).rejects.toThrow('account_changed');
    await expect(
      activateKol(uid, { code: CODE, ruleRevision: 2, expectedUserUid: uid })
    ).rejects.toThrow('rule_changed');
    await db.registrationSource.create({ data: { userUid: uid, source: 'API' } });
    await expect(previewKolActivation(uid, CODE)).rejects.toThrow('ineligible');
    await db.registrationSource.deleteMany();
    await db.kolActivationCode.update({ where: { id: code.id }, data: { status: 'REVOKED' } });
    await expect(
      activateKol(uid, { code: CODE, ruleRevision: 1, expectedUserUid: uid })
    ).rejects.toThrow('revoked_code');
    expect(await db.registrationInviteCode.count()).toBe(0);
  });
});
