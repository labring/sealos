import { v4 } from 'uuid';
import { connectToDatabase } from './mongodb';

export type SmsType =
  | 'phone'
  | 'phone_login'
  | 'phone_bind'
  | 'phone_change_old'
  | 'phone_change_new'
  | 'phone_unbind'
  | 'alert_bind_phone'
  | 'email'
  | 'email_login'
  | 'email_bind'
  | 'email_unbind'
  | 'email_change_old'
  | 'email_change_new'
  | 'alert_bind_email';

export type TVerification_Codes = {
  id: string;
  smsType: SmsType;
  code: string;
  uid: string;
  challengeId: string;
  createdAt: Date;
  attemptCount?: number;
};

export const VERIFICATION_CODE_TTL_MS = 5 * 60_000;
export const VERIFICATION_CODE_RESEND_MS = 60_000;
export const MAX_VERIFICATION_ATTEMPTS = 10;

const indexInitializations = new WeakMap<object, Promise<void>>();

async function connectToCollection() {
  const client = await connectToDatabase();
  const collection = client.db().collection<TVerification_Codes>('sms_verification_codes');
  let initialization = indexInitializations.get(client);
  if (!initialization) {
    initialization = Promise.all([
      collection.createIndex({ createdAt: 1 }, { expireAfterSeconds: 60 * 5 }),
      collection.createIndex({ uid: 1 }, { unique: true }),
      collection.createIndex({ challengeId: 1 }, { unique: true, sparse: true }),
      collection.createIndex({ id: 1, smsType: 1 }, { unique: true })
    ])
      .then(() => undefined)
      .catch((error) => {
        indexInitializations.delete(client);
        throw error;
      });
    indexInitializations.set(client, initialization);
  }
  await initialization;
  return collection;
}

export async function addOrUpdateCode({
  id,
  smsType,
  code
}: {
  id: string;
  code: string;
  smsType: SmsType;
}) {
  const codes = await connectToCollection();
  const uid = v4();
  const challengeId = v4();
  await codes.updateOne(
    { id, smsType },
    {
      $set: {
        id,
        smsType,
        code,
        uid,
        challengeId,
        attemptCount: 0,
        createdAt: new Date()
      }
    },
    { upsert: true }
  );
  return { uid, challengeId };
}

export async function checkSendable({ id, smsType }: { id: string; smsType: SmsType }) {
  const codes = await connectToCollection();
  const result = await codes.findOne({
    id,
    smsType,
    createdAt: { $gt: new Date(Date.now() - VERIFICATION_CODE_RESEND_MS) }
  });
  return !result;
}

export type VerifyCodeResult =
  | { status: 'verified'; smsInfo: TVerification_Codes }
  | { status: 'invalid'; remainingAttempts: number }
  | { status: 'locked'; retryAfter: number }
  | { status: 'expired' };

const retryAfterFor = (createdAt: Date, now: Date) =>
  Math.max(
    0,
    Math.ceil((createdAt.getTime() + VERIFICATION_CODE_RESEND_MS - now.getTime()) / 1000)
  );

export async function verifyAndConsumeCode({
  id,
  smsType,
  code,
  challengeId
}: {
  id: string;
  smsType: SmsType;
  code: string;
  challengeId: string;
}): Promise<VerifyCodeResult> {
  const codes = await connectToCollection();
  const now = new Date();
  const baseFilter = {
    id,
    smsType,
    challengeId
  };
  const usableFilter = {
    ...baseFilter,
    createdAt: { $gt: new Date(now.getTime() - VERIFICATION_CODE_TTL_MS) },
    $or: [
      { attemptCount: { $lt: MAX_VERIFICATION_ATTEMPTS } },
      { attemptCount: { $exists: false } }
    ]
  };

  const verified = await codes.findOneAndDelete({ ...usableFilter, code });
  if (verified.value) {
    return { status: 'verified', smsInfo: verified.value };
  }

  const invalid = await codes.findOneAndUpdate(
    { ...usableFilter, code: { $ne: code } },
    { $inc: { attemptCount: 1 } },
    { returnDocument: 'after' }
  );
  if (invalid.value) {
    const attemptCount = invalid.value.attemptCount || 0;
    if (attemptCount >= MAX_VERIFICATION_ATTEMPTS) {
      return {
        status: 'locked',
        retryAfter: retryAfterFor(invalid.value.createdAt, now)
      };
    }
    return {
      status: 'invalid',
      remainingAttempts: MAX_VERIFICATION_ATTEMPTS - attemptCount
    };
  }

  const current = await codes.findOne(baseFilter);
  if (!current || current.createdAt <= new Date(now.getTime() - VERIFICATION_CODE_TTL_MS)) {
    return { status: 'expired' };
  }
  if ((current.attemptCount || 0) >= MAX_VERIFICATION_ATTEMPTS) {
    return { status: 'locked', retryAfter: retryAfterFor(current.createdAt, now) };
  }
  return { status: 'expired' };
}

export async function getInfoByUid({ uid }: { uid: string }) {
  const codes = await connectToCollection();
  return codes.findOne({ uid });
}

export async function deleteByUid({ uid }: { uid: string }) {
  const codes = await connectToCollection();
  return codes.deleteOne({ uid });
}
