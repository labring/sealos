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
import { activityRewardJob } from '@/services/backend/activity/worker';
import { getActivityStatusData, getInviteRecordList } from '@/services/backend/activity/status';
import { attachRegistrationInTransaction } from '@/services/backend/activity/registration';
import { callBillingService } from '@/services/backend/auth';
import {
  previewKolActivation,
  activateKol,
  reserveKolAttempt,
  KolActivationError
} from '@/services/backend/activity/kol';

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

  it('counts concurrent activation attempts without turning contention into server errors', async () => {
    const uid = await user();
    const clock = vi.spyOn(Date, 'now').mockReturnValue(1_800_000_000_000);
    try {
      const results = await Promise.allSettled(
        Array.from({ length: 30 }, () => reserveKolAttempt(uid))
      );
      expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(10);
      for (const result of results)
        if (result.status === 'rejected') {
          expect(result.reason).toBeInstanceOf(KolActivationError);
          expect(result.reason.status).toBe(429);
        }
    } finally {
      clock.mockRestore();
    }
  });

  it('rejects negative code and registration snapshot amounts at the database boundary', async () => {
    const inviter = await user();
    const invitee = await user();
    await expect(
      db.registrationInviteCode.create({
        data: {
          inviterUid: inviter,
          code: 'NEGATIVE',
          inviterRewardAmount: -1n
        }
      })
    ).rejects.toThrow();
    const code = await db.registrationInviteCode.create({
      data: { inviterUid: inviter, code: 'NONNEGATIVE' }
    });
    await expect(
      db.registrationReferral.create({
        data: {
          inviterUid: inviter,
          inviteeUid: invitee,
          codeId: code.id,
          inviteeRewardAmount: -1n
        }
      })
    ).rejects.toThrow();
  });
  it('previews a used activation as already activated only for its owner', async () => {
    const owner = await user();
    const other = await user();
    await activation(owner);
    await activateKol(owner, { code: CODE, ruleRevision: 1, expectedUserUid: owner });
    await expect(previewKolActivation(owner, CODE)).rejects.toThrow('already_activated');
    await expect(previewKolActivation(other, CODE)).rejects.toThrow('used_code');
    expect(await db.kolActivationCode.count({ where: { status: 'ACTIVATED' } })).toBe(1);
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

  it('binds both monetary snapshots at registration and atomically pays them without codes', async () => {
    const inviter = await user();
    await wallet(inviter);
    const invitee = await eligible('11010119900101001X');
    const code = await db.registrationInviteCode.create({
      data: {
        inviterUid: inviter,
        code: 'ABC23456',
        inviterRewardAmount: 10_000_000n,
        inviteeRewardAmount: 5_000_000n,
        ruleRevision: 2
      }
    });
    await db.$transaction((tx) =>
      attachRegistrationInTransaction(tx, invitee, { source: 'WEB', inviteCode: code.code })
    );
    await db.registrationInviteCode.update({
      where: { id: code.id },
      data: {
        inviterRewardAmount: 20_000_000n,
        inviteeRewardAmount: 0n,
        enabled: false,
        ruleRevision: 3
      }
    });
    await Promise.all(Array.from({ length: 6 }, () => checkAndGrantUserRewards(invitee)));
    const referral = await db.registrationReferral.findUniqueOrThrow({
      where: { inviteeUid: invitee }
    });
    expect([
      referral.inviterRewardAmount,
      referral.inviteeRewardAmount,
      referral.ruleRevision
    ]).toEqual([10_000_000n, 5_000_000n, 2]);
    expect((await db.account.findUniqueOrThrow({ where: { userUid: inviter } })).balance).toBe(
      110_000_000n
    );
    const account = await db.account.findUniqueOrThrow({ where: { userUid: invitee } });
    expect(account.balance).toBe(115_000_000n);
    expect(account.deduction_balance).toBe(7_000_000n);
    expect(account.activityBonus).toBe(0n);
    expect(await db.giftCode.count()).toBe(0);
    expect(callBillingService).not.toHaveBeenCalled();
    const receipts = await db.accountTransaction.findMany({ where: { userUid: invitee } });
    expect(receipts).toHaveLength(2);
    expect(
      receipts.map((r) => r.balance - r.balance_before!).sort((a, b) => (a < b ? -1 : 1))
    ).toEqual([5_000_000n, 10_000_000n]);
    const grants = await db.activityRewardGrant.findMany();
    expect(grants).toHaveLength(3);
    expect(
      grants.every((g) => g.status === 'REDEEMED' && !!g.accountTransactionId && !g.giftCodeId)
    ).toBe(true);
    expect((await getInviteRecordList(inviter, 1, 10)).items[0]).toMatchObject({
      status: 'credited',
      rewardAmount: '10000000'
    });
    expect((await getActivityStatusData(inviter)).invite.inviteUrl).toBeNull();
  }, 30000);

  it.each(['recipient', 'amount'])(
    'stops a conflicting %s business claim before another payout',
    async (conflict) => {
      const inviter = await user();
      await wallet(inviter);
      const invitee = await eligible('11010119900101001X');
      await checkAndGrantUserRewards(invitee);
      const code = await db.registrationInviteCode.create({
        data: { inviterUid: inviter, code: 'ABC23456' }
      });
      await db.$transaction((tx) =>
        attachRegistrationInTransaction(tx, invitee, { source: 'WEB', inviteCode: code.code })
      );
      const referral = await db.registrationReferral.findUniqueOrThrow({
        where: { inviteeUid: invitee }
      });
      await db.activityRewardGrant.create({
        data: {
          recipientUid: conflict === 'recipient' ? inviter : invitee,
          type: 'REFERRAL_INVITEE',
          referralId: referral.id,
          businessKey: `REFERRAL_INVITEE:${referral.id}`,
          amount: conflict === 'amount' ? 1n : referral.inviteeRewardAmount,
          status: 'REDEEMED'
        }
      });
      await checkAndGrantUserRewards(invitee);
      expect((await db.account.findUniqueOrThrow({ where: { userUid: inviter } })).balance).toBe(
        100_000_000n
      );
      expect(await db.activityRewardGrant.count()).toBe(2);
      expect(await db.accountTransaction.count()).toBe(1);
    }
  );

  it.each([
    ['invitee', 'missing_wallet'],
    ['inviter', 'missing_wallet'],
    ['invitee', 'overflow'],
    ['inviter', 'overflow'],
    ['invitee', 'receipt_failure'],
    ['inviter', 'receipt_failure']
  ])(
    'pays the other side when %s has %s and compensates only the failed side',
    async (side, failure) => {
      const inviter = await user();
      await wallet(inviter);
      const invitee = await eligible('11010119900101001X');
      await checkAndGrantUserRewards(invitee);
      const code = await db.registrationInviteCode.create({
        data: { inviterUid: inviter, code: 'ABC23456' }
      });
      await db.$transaction((tx) =>
        attachRegistrationInTransaction(tx, invitee, { source: 'WEB', inviteCode: code.code })
      );
      const blocked = side === 'invitee' ? invitee : inviter;
      const other = side === 'invitee' ? inviter : invitee;
      const before = (await db.account.findUniqueOrThrow({ where: { userUid: blocked } })).balance!;
      const otherBefore = (await db.account.findUniqueOrThrow({ where: { userUid: other } }))
        .balance!;
      if (failure === 'missing_wallet') await db.account.delete({ where: { userUid: blocked } });
      else if (failure === 'overflow')
        await db.account.update({
          where: { userUid: blocked },
          data: { balance: 9223372036854775807n }
        });
      else
        await db.$executeRawUnsafe(
          `ALTER TABLE "AccountTransaction" ADD CONSTRAINT "kol_test_single_receipt" CHECK ("userUid" <> '${blocked}'::UUID OR "message" NOT LIKE 'activity:REFERRAL_%')`
        );
      try {
        await checkAndGrantUserRewards(invitee);
        expect((await db.account.findUniqueOrThrow({ where: { userUid: other } })).balance).toBe(
          otherBefore + 5_000_000n
        );
        expect(
          await db.activityRewardGrant.findFirst({
            where: { type: side === 'invitee' ? 'REFERRAL_INVITEE' : 'REFERRAL_INVITER' }
          })
        ).toMatchObject({
          status: 'RETRYABLE_FAILURE',
          accountTransactionId: null,
          redeemedAt: null
        });
        expect(await db.accountTransaction.count()).toBe(2);
      } finally {
        if (failure === 'receipt_failure')
          await db.$executeRawUnsafe(
            'ALTER TABLE "AccountTransaction" DROP CONSTRAINT "kol_test_single_receipt"'
          );
      }
      if (failure === 'missing_wallet') await wallet(blocked);
      else if (failure === 'overflow')
        await db.account.update({ where: { userUid: blocked }, data: { balance: before } });
      await checkAndGrantUserRewards(invitee);
      expect((await db.account.findUniqueOrThrow({ where: { userUid: blocked } })).balance).toBe(
        (failure === 'missing_wallet' ? 100_000_000n : before) + 5_000_000n
      );
      expect((await db.account.findUniqueOrThrow({ where: { userUid: other } })).balance).toBe(
        otherBefore + 5_000_000n
      );
      expect(await db.activityRewardGrant.count()).toBe(3);
      expect(await db.accountTransaction.count()).toBe(3);
    }
  );

  it('counts eligible zero rewards without money rows and does not retry them', async () => {
    const inviter = await user();
    const invitee = await eligible('110101199001010028');
    const code = await db.registrationInviteCode.create({
      data: {
        inviterUid: inviter,
        code: 'ABC23456',
        inviterRewardAmount: 0n,
        inviteeRewardAmount: 0n
      }
    });
    await db.$transaction((tx) =>
      attachRegistrationInTransaction(tx, invitee, { source: 'WEB', inviteCode: code.code })
    );
    await checkAndGrantUserRewards(invitee);
    await checkAndGrantUserRewards(invitee);
    expect(await db.activityRewardGrant.count()).toBe(1);
    expect(await db.accountTransaction.count()).toBe(1);
    expect((await getActivityStatusData(inviter)).invite).toMatchObject({
      validCount: 1,
      creditedAmount: '0'
    });
    expect((await getActivityStatusData(invitee)).inviteeGift).toMatchObject({
      status: 'no_reward',
      amount: '0'
    });
    expect((await getInviteRecordList(inviter, 1, 10)).items[0]).toMatchObject({
      status: 'no_reward',
      rewardAmount: '0'
    });
  });

  it.each(['missing_wallet', 'overflow', 'receipt_failure'])(
    'pays the inviter when the invitee first qualifies with %s',
    async (failure) => {
      const inviter = await user();
      await wallet(inviter);
      const invitee = await eligible('11010119900101001X');
      const code = await db.registrationInviteCode.create({
        data: { inviterUid: inviter, code: 'FIRSTFAIL' }
      });
      await db.$transaction((tx) =>
        attachRegistrationInTransaction(tx, invitee, { source: 'WEB', inviteCode: code.code })
      );
      if (failure === 'missing_wallet') await db.account.delete({ where: { userUid: invitee } });
      else if (failure === 'overflow')
        await db.account.update({
          where: { userUid: invitee },
          data: { balance: 9223372036854775807n }
        });
      else
        await db.$executeRawUnsafe(
          `ALTER TABLE "AccountTransaction" ADD CONSTRAINT "kol_test_first_receipt" CHECK ("message" NOT LIKE 'activity:DESKTOP_FIRST_LOGIN:%')`
        );
      try {
        await checkAndGrantUserRewards(invitee);
        expect((await db.account.findUniqueOrThrow({ where: { userUid: inviter } })).balance).toBe(
          105_000_000n
        );
        const first = await db.activityRewardGrant.findUniqueOrThrow({
          where: { businessKey: `DESKTOP_FIRST_LOGIN:${invitee}` }
        });
        expect(first.status).not.toBe('REDEEMED');
        expect(first.identityKey).toMatch(/^v1:/);
        expect(first.accountTransactionId).toBeNull();
        expect(await db.accountTransaction.count({ where: { userUid: inviter } })).toBe(1);
      } finally {
        if (failure === 'receipt_failure')
          await db.$executeRawUnsafe(
            'ALTER TABLE "AccountTransaction" DROP CONSTRAINT "kol_test_first_receipt"'
          );
      }
    }
  );

  it.each(['worker', 'online'])(
    'rotates %s compensation past twenty persistent creation failures',
    async (entry) => {
      const inviter = await user();
      await wallet(inviter);
      const invitees = Array.from({ length: 21 }, () => randomUUID());
      await db.user.createMany({
        data: invitees.map((uid) => ({ uid, id: uid, name: uid, nickname: 'test', avatarUri: '' }))
      });
      const code = await db.registrationInviteCode.create({
        data: { inviterUid: inviter, code: 'ROTATION' }
      });
      const referrals = invitees.map((uid, index) => ({
        id: randomUUID(),
        inviteeUid: uid,
        inviterUid: inviter,
        codeId: code.id,
        inviteeRewardAmount: 0n,
        // 第一轮必须取到 20 条失败记录，避免随机 UUID 让健康记录提前进入批次。
        rewardCheckedAt: new Date(Date.now() - (index === 0 ? 0 : 1000)),
        // Worker 的健康记录最旧，在线入口的健康记录最新，分别覆盖两个方向的饥饿。
        registeredAt: new Date(Date.now() - (entry === 'worker' ? 21 - index : index) * 1000)
      }));
      await db.registrationReferral.createMany({ data: referrals });
      await db.activityRewardGrant.createMany({
        data: invitees.map((uid, index) => ({
          recipientUid: uid,
          type: 'DESKTOP_FIRST_LOGIN' as const,
          businessKey: `DESKTOP_FIRST_LOGIN:${uid}`,
          identityKey: `v1:rotation-${index}`,
          amount: 10_000_000n,
          status: 'REDEEMED' as const
        }))
      });
      const blocked = new Set(referrals.slice(1).map((row) => row.id));
      let injecting = true;
      db.$use(async (params, next) => {
        if (
          injecting &&
          params.model === 'ActivityRewardGrant' &&
          params.action === 'create' &&
          blocked.has(params.args.data.referralId)
        )
          throw new Error('simulated persistent reward storage failure');
        return next(params);
      });
      try {
        for (let round = 0; round < 2; round++) {
          if (entry === 'worker') await activityRewardJob();
          else await checkAndGrantUserRewards(inviter);
          expect(
            (await db.account.findUniqueOrThrow({ where: { userUid: inviter } })).balance
          ).toBe(round === 0 ? 100_000_000n : 105_000_000n);
        }
        expect((await db.account.findUniqueOrThrow({ where: { userUid: inviter } })).balance).toBe(
          105_000_000n
        );
        expect(await db.accountTransaction.count()).toBe(1);
      } finally {
        injecting = false;
      }
    },
    30000
  );

  it('retains the unpaid identity intent while waiting for wallet initialization and then recovers', async () => {
    const uid = await eligible('11010119900101001X');
    await db.account.delete({ where: { userUid: uid } });
    await checkAndGrantUserRewards(uid);
    expect(
      await db.activityRewardGrant.findUnique({
        where: { businessKey: `DESKTOP_FIRST_LOGIN:${uid}` }
      })
    ).toMatchObject({ status: 'RETRYABLE_FAILURE', accountTransactionId: null, redeemedAt: null });
    expect(await db.accountTransaction.count()).toBe(0);
    await wallet(uid);
    await checkAndGrantUserRewards(uid);
    expect((await db.account.findUniqueOrThrow({ where: { userUid: uid } })).balance).toBe(
      110_000_000n
    );
    expect(await db.activityRewardGrant.count()).toBe(1);
  });

  it('shows qualified zero rewards even when the first-login wallet is not initialized', async () => {
    const inviter = await user();
    const invitee = await eligible('11010119900101001X');
    const code = await db.registrationInviteCode.create({
      data: {
        inviterUid: inviter,
        code: 'ZEROWALLET',
        inviterRewardAmount: 0n,
        inviteeRewardAmount: 0n
      }
    });
    await db.$transaction((tx) =>
      attachRegistrationInTransaction(tx, invitee, { source: 'WEB', inviteCode: code.code })
    );
    await db.account.delete({ where: { userUid: invitee } });
    await checkAndGrantUserRewards(invitee);
    expect((await getActivityStatusData(inviter)).invite).toMatchObject({
      validCount: 1,
      creditedAmount: '0'
    });
    expect((await getActivityStatusData(invitee)).inviteeGift).toMatchObject({
      status: 'no_reward',
      amount: '0'
    });
    expect((await getInviteRecordList(inviter, 1, 10)).items[0]).toMatchObject({
      status: 'no_reward',
      rewardAmount: '0'
    });
    expect(await db.activityRewardGrant.count()).toBe(1);
    expect(await db.accountTransaction.count()).toBe(0);
    expect(await db.account.count()).toBe(0);
  });

  it('rolls back money but retains the unpaid intent when writing the receipt fails', async () => {
    const uid = await eligible('11010119900101001X');
    await db.$executeRawUnsafe(
      `ALTER TABLE "AccountTransaction" ADD CONSTRAINT "kol_test_fail_receipt" CHECK (type <> 'ActivityReward')`
    );
    try {
      await checkAndGrantUserRewards(uid);
      expect((await db.account.findUniqueOrThrow({ where: { userUid: uid } })).balance).toBe(
        100_000_000n
      );
      expect(
        await db.activityRewardGrant.findUnique({
          where: { businessKey: `DESKTOP_FIRST_LOGIN:${uid}` }
        })
      ).toMatchObject({
        status: 'RETRYABLE_FAILURE',
        accountTransactionId: null,
        redeemedAt: null
      });
      expect(await db.accountTransaction.count()).toBe(0);
    } finally {
      await db.$executeRawUnsafe(
        'ALTER TABLE "AccountTransaction" DROP CONSTRAINT "kol_test_fail_receipt"'
      );
    }
    await checkAndGrantUserRewards(uid);
    expect((await db.account.findUniqueOrThrow({ where: { userUid: uid } })).balance).toBe(
      110_000_000n
    );
  });
});
