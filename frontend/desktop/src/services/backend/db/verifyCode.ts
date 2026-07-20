import { v4 } from 'uuid';
import { globalPrisma } from './init';
import { withSerializableTransaction } from './transaction';

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
  createdAt: Date;
  expiresAt: Date;
  attemptCount: number;
};

export const VERIFICATION_CODE_TTL_MS = 5 * 60_000;
export const VERIFICATION_CODE_RESEND_MS = 60_000;
export const MAX_VERIFICATION_ATTEMPTS = 10;

const getProviderType = (smsType: SmsType) =>
  smsType.startsWith('phone') || smsType === 'alert_bind_phone' ? 'PHONE' : 'EMAIL';

const toVerificationInfo = (record: {
  uid: string;
  scenario: string;
  providerId: string;
  code: string;
  createdAt: Date;
  expiresAt: Date;
  attemptCount: number;
}): TVerification_Codes => ({
  uid: record.uid,
  id: record.providerId,
  smsType: record.scenario as SmsType,
  code: record.code,
  createdAt: record.createdAt,
  expiresAt: record.expiresAt,
  attemptCount: record.attemptCount
});

export async function addOrUpdateCode({
  id,
  smsType,
  code
}: {
  id: string;
  code: string;
  smsType: SmsType;
}) {
  const now = new Date();
  return globalPrisma.verificationCode.upsert({
    where: {
      scenario_providerType_providerId: {
        scenario: smsType,
        providerType: getProviderType(smsType),
        providerId: id
      }
    },
    create: {
      uid: v4(),
      scenario: smsType,
      providerType: getProviderType(smsType),
      providerId: id,
      code,
      attemptCount: 0,
      expiresAt: new Date(now.getTime() + VERIFICATION_CODE_TTL_MS),
      createdAt: now
    },
    update: {
      uid: v4(),
      code,
      attemptCount: 0,
      expiresAt: new Date(now.getTime() + VERIFICATION_CODE_TTL_MS),
      createdAt: now
    }
  });
}

export type VerifyCodeResult =
  | { status: 'verified'; smsInfo: TVerification_Codes }
  | { status: 'invalid'; remainingAttempts: number }
  | { status: 'locked'; retryAfter: number }
  | { status: 'expired' };

export async function verifyAndConsumeCode({
  id,
  smsType,
  code
}: {
  id: string;
  smsType: SmsType;
  code: string;
}): Promise<VerifyCodeResult> {
  return withSerializableTransaction(async (tx) => {
    const now = new Date();
    const record = await tx.verificationCode.findUnique({
      where: {
        scenario_providerType_providerId: {
          scenario: smsType,
          providerType: getProviderType(smsType),
          providerId: id
        }
      }
    });

    if (!record || record.expiresAt <= now) return { status: 'expired' };
    if (record.attemptCount >= MAX_VERIFICATION_ATTEMPTS) {
      return {
        status: 'locked',
        retryAfter: Math.max(
          0,
          Math.ceil(
            (record.createdAt.getTime() + VERIFICATION_CODE_RESEND_MS - now.getTime()) / 1000
          )
        )
      };
    }

    if (record.code === code) {
      const deleted = await tx.verificationCode.deleteMany({
        where: {
          uid: record.uid,
          code,
          attemptCount: { lt: MAX_VERIFICATION_ATTEMPTS },
          expiresAt: { gt: now }
        }
      });
      return deleted.count === 1
        ? { status: 'verified', smsInfo: toVerificationInfo(record) }
        : { status: 'expired' };
    }

    const updated = await tx.verificationCode.updateMany({
      where: {
        uid: record.uid,
        code: { not: code },
        attemptCount: { lt: MAX_VERIFICATION_ATTEMPTS },
        expiresAt: { gt: now }
      },
      data: { attemptCount: { increment: 1 } }
    });
    if (updated.count !== 1) return { status: 'expired' };

    const attemptCount = record.attemptCount + 1;
    if (attemptCount >= MAX_VERIFICATION_ATTEMPTS) {
      return {
        status: 'locked',
        retryAfter: Math.max(
          0,
          Math.ceil(
            (record.createdAt.getTime() + VERIFICATION_CODE_RESEND_MS - now.getTime()) / 1000
          )
        )
      };
    }
    return {
      status: 'invalid',
      remainingAttempts: MAX_VERIFICATION_ATTEMPTS - attemptCount
    };
  });
}

export async function deleteExpiredVerificationCodes(now = new Date()) {
  return globalPrisma.verificationCode.deleteMany({ where: { expiresAt: { lte: now } } });
}
