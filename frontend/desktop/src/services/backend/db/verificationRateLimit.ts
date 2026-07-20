import { createHash } from 'crypto';
import { getClientIp } from '../requestIp';
import type { NextApiRequest } from 'next';
import { globalPrisma } from './init';
import { withSerializableTransaction } from './transaction';

type RateLimitRule = {
  key: string;
  limit: number;
  windowMs: number;
};

export type VerificationRateLimitReservation = {
  entries: Array<{
    key: string;
    windowStartedAt: Date;
  }>;
};

export type VerificationRateLimitResult =
  | { allowed: true; reservation: VerificationRateLimitReservation }
  | { allowed: false; retryAfter: number };

class RateLimitExceededError extends Error {
  constructor(readonly retryAfter: number) {
    super('Verification send rate limit exceeded');
  }
}

const hashSubject = (value: string) => createHash('sha256').update(value).digest('hex');

const normalizeId = (id: string, providerType: string) =>
  providerType === 'EMAIL' ? id.trim().toLowerCase() : id.replace(/\s+/g, '');

const makeRules = (req: NextApiRequest, id: string, providerType: string): RateLimitRule[] => {
  const subject = hashSubject(`${providerType}:${normalizeId(id, providerType)}`);
  const rules: RateLimitRule[] = [
    { key: `verification:id:minute:${subject}`, limit: 1, windowMs: 60_000 },
    { key: `verification:id:hour:${subject}`, limit: 5, windowMs: 60 * 60_000 }
  ];
  const clientIp = getClientIp(req);
  if (clientIp) {
    rules.push({
      key: `verification:ip:ten-minute:${hashSubject(clientIp)}`,
      limit: 20,
      windowMs: 10 * 60_000
    });
  }
  return rules;
};

export async function reserveVerificationSend(
  req: NextApiRequest,
  id: string,
  providerType: string
): Promise<VerificationRateLimitResult> {
  const rules = makeRules(req, id, providerType);
  const now = new Date();

  try {
    const entries = await withSerializableTransaction(async (tx) => {
      const reservedEntries: VerificationRateLimitReservation['entries'] = [];
      for (const rule of rules) {
        const current = await tx.verificationRateLimit.findUnique({ where: { key: rule.key } });
        if (!current || current.expiresAt <= now) {
          await tx.verificationRateLimit.upsert({
            where: { key: rule.key },
            create: {
              key: rule.key,
              count: 1,
              windowStartedAt: now,
              expiresAt: new Date(now.getTime() + rule.windowMs)
            },
            update: {
              count: 1,
              windowStartedAt: now,
              expiresAt: new Date(now.getTime() + rule.windowMs)
            }
          });
          reservedEntries.push({ key: rule.key, windowStartedAt: now });
          continue;
        }
        if (current.count >= rule.limit) {
          throw new RateLimitExceededError(
            Math.max(1, Math.ceil((current.expiresAt.getTime() - now.getTime()) / 1000))
          );
        }
        await tx.verificationRateLimit.update({
          where: { key: rule.key },
          data: { count: { increment: 1 } }
        });
        reservedEntries.push({
          key: rule.key,
          windowStartedAt: current.windowStartedAt
        });
      }
      return reservedEntries;
    });
    return { allowed: true, reservation: { entries } };
  } catch (error) {
    if (error instanceof RateLimitExceededError) {
      return { allowed: false, retryAfter: error.retryAfter };
    }
    throw error;
  }
}

export async function releaseVerificationSend(reservation: VerificationRateLimitReservation) {
  await globalPrisma.verificationRateLimit.updateMany({
    where: {
      OR: reservation.entries.map(({ key, windowStartedAt }) => ({
        key,
        windowStartedAt,
        count: { gt: 0 }
      }))
    },
    data: { count: { decrement: 1 } }
  });
}

export async function deleteExpiredVerificationRateLimits(now = new Date()) {
  return globalPrisma.verificationRateLimit.deleteMany({ where: { expiresAt: { lte: now } } });
}
