import { createHash } from 'crypto';
import type { NextApiRequest } from 'next';
import { MongoServerError } from 'mongodb';
import { connectToDatabase } from './mongodb';
import { getClientIp } from '../requestIp';

type RateLimitRule = {
  key: string;
  limit: number;
  windowMs: number;
};

type VerificationRateLimit = {
  key: string;
  count: number;
  windowStartedAt: Date;
  expiresAt: Date;
};

export type VerificationRateLimitReservation = {
  entries: Array<Pick<VerificationRateLimit, 'key' | 'windowStartedAt'>>;
};

export type VerificationRateLimitResult =
  | { allowed: true; reservation: VerificationRateLimitReservation }
  | { allowed: false; retryAfter: number };

class RateLimitExceededError extends Error {
  constructor(readonly retryAfter: number) {
    super('Verification send rate limit exceeded');
  }
}

async function connectToCollection() {
  const client = await connectToDatabase();
  const collection = client.db().collection<VerificationRateLimit>('verification_rate_limits');
  await collection.createIndex({ key: 1 }, { unique: true });
  await collection.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
  return collection;
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

const retryAfterFor = (expiresAt: Date, now: Date) =>
  Math.max(1, Math.ceil((expiresAt.getTime() - now.getTime()) / 1000));

async function reserveRule(rule: RateLimitRule, now: Date) {
  const limits = await connectToCollection();

  for (let attempt = 0; attempt < 10; attempt += 1) {
    const current = await limits.findOne({ key: rule.key });
    if (!current || current.expiresAt <= now) {
      try {
        const reset = await limits.findOneAndUpdate(
          {
            key: rule.key,
            $or: [{ expiresAt: { $lte: now } }, { expiresAt: { $exists: false } }]
          },
          {
            $set: {
              count: 1,
              windowStartedAt: now,
              expiresAt: new Date(now.getTime() + rule.windowMs)
            }
          },
          { upsert: true, returnDocument: 'after' }
        );
        if (reset.value) {
          return { key: rule.key, windowStartedAt: reset.value.windowStartedAt };
        }
      } catch (error) {
        if (!(error instanceof MongoServerError) || error.code !== 11000) throw error;
      }
      continue;
    }

    if (current.count >= rule.limit) {
      throw new RateLimitExceededError(retryAfterFor(current.expiresAt, now));
    }

    const incremented = await limits.findOneAndUpdate(
      {
        key: rule.key,
        windowStartedAt: current.windowStartedAt,
        expiresAt: { $gt: now },
        count: { $lt: rule.limit }
      },
      { $inc: { count: 1 } },
      { returnDocument: 'after' }
    );
    if (incremented.value) {
      return { key: rule.key, windowStartedAt: incremented.value.windowStartedAt };
    }
  }

  throw new Error('Failed to reserve verification rate limit after concurrent updates');
}

export async function releaseVerificationSend(reservation: VerificationRateLimitReservation) {
  const limits = await connectToCollection();
  await Promise.all(
    reservation.entries.map(({ key, windowStartedAt }) =>
      limits.updateOne({ key, windowStartedAt, count: { $gt: 0 } }, { $inc: { count: -1 } })
    )
  );
}

export async function reserveVerificationSend(
  req: NextApiRequest,
  id: string,
  providerType: string
): Promise<VerificationRateLimitResult> {
  const reservation: VerificationRateLimitReservation = { entries: [] };
  try {
    for (const rule of makeRules(req, id, providerType)) {
      reservation.entries.push(await reserveRule(rule, new Date()));
    }
    return { allowed: true, reservation };
  } catch (error) {
    if (reservation.entries.length > 0) {
      try {
        await releaseVerificationSend(reservation);
      } catch (releaseError) {
        console.error('Failed to roll back verification rate limit reservation:', releaseError);
      }
    }
    if (error instanceof RateLimitExceededError) {
      return { allowed: false, retryAfter: error.retryAfter };
    }
    throw error;
  }
}
