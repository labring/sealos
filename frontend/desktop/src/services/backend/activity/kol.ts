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
  if (activation.status === 'ACTIVATED') throw new KolActivationError('used_code');
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
  const record = await globalPrisma.oAuthCodeRateLimit.upsert({
    where: { key: `kol:${userUid}:${bucket}` },
    create: {
      key: `kol:${userUid}:${bucket}`,
      count: 1,
      expiresAt: new Date((bucket + 2) * 60_000)
    },
    update: { count: { increment: 1 } }
  });
  if (record.count > 10) throw new KolActivationError('rate_limited', 429);
};
