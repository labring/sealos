import { createHash } from 'node:crypto';
import { globalPrisma } from '@/services/backend/db/init';
import { isActivityAvailable } from '@/services/enable';
import { Prisma } from 'prisma/global/generated/client';
import { generateInviteCode } from './codes';
import { isUniqueConstraintError, type TransactionClient } from './registration';

export class KolActivationError extends Error {
  constructor(public readonly reason: string, public readonly status = 400) {
    super(reason);
  }
}

const hashCode = (code: string) => {
  const normalized = code.trim().toUpperCase();
  if (!/^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{32}$/.test(normalized)) {
    throw new KolActivationError('invalid_code');
  }
  return createHash('sha256').update(normalized).digest('hex');
};

async function requireEligibleUser(tx: TransactionClient, userUid: string) {
  if (!isActivityAvailable()) throw new KolActivationError('unavailable', 503);
  const [user, source] = await Promise.all([
    tx.user.findUnique({
      where: { uid: userUid },
      select: { uid: true, id: true, nickname: true, status: true }
    }),
    tx.registrationSource.findUnique({ where: { userUid }, select: { source: true } })
  ]);
  // 开通推广资格只需要真实注册账号；不补建钱包，也不要求邀请人实名。
  if (!user || user.status !== 'NORMAL_USER' || source?.source === 'API') {
    throw new KolActivationError('ineligible', 403);
  }
  return user;
}

export const previewKolActivation = async (userUid: string, code: string) => {
  const codeHash = hashCode(code);
  const user = await requireEligibleUser(globalPrisma, userUid);
  const [activation, own] = await Promise.all([
    globalPrisma.kolActivationCode.findUnique({ where: { codeHash } }),
    globalPrisma.kolActivationCode.findUnique({ where: { activatedByUid: userUid } })
  ]);
  if (!activation) throw new KolActivationError('invalid_code');
  if (activation.status === 'REVOKED') throw new KolActivationError('revoked_code');
  if (activation.status === 'ACTIVATED')
    throw new KolActivationError(
      activation.activatedByUid === userUid ? 'already_activated' : 'used_code'
    );
  if (own) throw new KolActivationError('already_activated');
  return {
    account: { userUid: user.uid, userId: user.id, nickname: user.nickname },
    inviterRewardAmount: activation.inviterRewardAmount.toString(),
    inviteeRewardAmount: activation.inviteeRewardAmount.toString(),
    ruleRevision: activation.ruleRevision
  };
};

export const activateKol = async (
  userUid: string,
  input: {
    code: string;
    ruleRevision: number;
    expectedUserUid: string;
  }
) => {
  if (input.expectedUserUid !== userUid) throw new KolActivationError('account_changed', 409);
  const codeHash = hashCode(input.code);
  for (let attempt = 0; ; attempt++) {
    try {
      return await globalPrisma.$transaction(
        async (tx) => {
          await requireEligibleUser(tx, userUid);
          const activation = await tx.kolActivationCode.findUnique({ where: { codeHash } });
          if (!activation) throw new KolActivationError('invalid_code');
          // 成功后的同账号重试仅返回结果，绝不能恢复运营后来改过的金额。
          if (activation.status === 'ACTIVATED') {
            if (activation.activatedByUid === userUid) return { activated: true as const };
            throw new KolActivationError('used_code');
          }
          if (activation.status === 'REVOKED') throw new KolActivationError('revoked_code');
          if (activation.ruleRevision !== input.ruleRevision)
            throw new KolActivationError('rule_changed', 409);
          if (await tx.kolActivationCode.findUnique({ where: { activatedByUid: userUid } })) {
            throw new KolActivationError('already_activated');
          }
          const claim = await tx.kolActivationCode.updateMany({
            where: { id: activation.id, status: 'UNUSED', ruleRevision: input.ruleRevision },
            data: { status: 'ACTIVATED', activatedByUid: userUid, activatedAt: new Date() }
          });
          if (claim.count !== 1) throw new KolActivationError('used_code');
          await tx.registrationInviteCode.upsert({
            where: { inviterUid: userUid },
            create: {
              inviterUid: userUid,
              code: generateInviteCode(),
              inviterRewardAmount: activation.inviterRewardAmount,
              inviteeRewardAmount: activation.inviteeRewardAmount
            },
            update: {
              inviterRewardAmount: activation.inviterRewardAmount,
              inviteeRewardAmount: activation.inviteeRewardAmount,
              ruleRevision: { increment: 1 }
            }
          });
          await tx.eventLog.create({
            data: {
              mainId: userUid,
              eventName: 'kol.activated',
              data: JSON.stringify({
                activationId: activation.id,
                ruleRevision: activation.ruleRevision,
                inviterRewardAmount: activation.inviterRewardAmount.toString(),
                inviteeRewardAmount: activation.inviteeRewardAmount.toString()
              })
            }
          });
          return { activated: true as const };
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
      );
    } catch (error) {
      const retryable =
        isUniqueConstraintError(error) ||
        (typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2034');
      if (!retryable || attempt >= 2) throw error;
    }
  }
};

/** Share the existing durable rate-limit table, with a distinct user-scoped namespace. */
export const reserveKolAttempt = async (userUid: string) => {
  const now = Date.now();
  const bucket = Math.floor(now / 60_000);
  const key = `kol:${userUid}:${bucket}`;
  const expiresAt = new Date((bucket + 2) * 60_000);
  for (let attempt = 0; ; attempt++) {
    try {
      // Prisma 5 的 upsert 在竞争创建时可抛唯一冲突；让数据库用单条语句原子累计。
      const [record] = await globalPrisma.$queryRaw<{ count: number }[]>`
        INSERT INTO "OAuthCodeRateLimit" ("key", "count", "expiresAt")
        VALUES (${key}, 1, ${expiresAt})
        ON CONFLICT ("key") DO UPDATE SET "count" = "OAuthCodeRateLimit"."count" + 1
        RETURNING "count"
      `;
      if (!record || record.count > 10) throw new KolActivationError('rate_limited', 429);
      return;
    } catch (error) {
      const retryable =
        error &&
        typeof error === 'object' &&
        'code' in error &&
        (error.code === 'P2034' ||
          (error.code === 'P2010' &&
            'meta' in error &&
            typeof error.meta === 'object' &&
            error.meta !== null &&
            'code' in error.meta &&
            (error.meta.code === '40001' || error.meta.code === '40P01')));
      if (!retryable || attempt >= 4) throw error;
      await new Promise<void>((resolve) =>
        setTimeout(resolve, 20 * 2 ** attempt + Math.floor(Math.random() * 20))
      );
    }
  }
};
