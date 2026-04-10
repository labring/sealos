import { v4 } from 'uuid';
import { prisma } from './init';
import {
  VERIFICATION_CODE_SCENARIOS,
  VERIFICATION_PROVIDER_TYPES,
  type VerificationCodeScenario,
  type VerificationProviderType
} from '@/constants/verification';

export type SmsType =
  | 'phone'
  | 'phone_login'
  | 'phone_bind'
  | 'phone_change_old'
  | 'phone_change_new'
  | 'phone_unbind'
  | 'email'
  | 'email_login'
  | 'email_bind'
  | 'email_unbind'
  | 'email_change_old'
  | 'email_change_new';

export type TVerification_Codes = {
  id: string;
  smsType: SmsType;
  code: string;
  uid: string;
  createdAt: Date;
  expiresAt: Date;
  userUid: string | null;
  providerType: VerificationProviderType;
};

const VERIFICATION_EXPIRE_MS = 5 * 60 * 1000;

function buildExpiresAt(ms: number) {
  return new Date(Date.now() + ms);
}

function getScenario(smsType: SmsType): VerificationCodeScenario {
  switch (smsType) {
    case 'phone':
      return VERIFICATION_CODE_SCENARIOS.PHONE;
    case 'phone_login':
      return VERIFICATION_CODE_SCENARIOS.PHONE_LOGIN;
    case 'phone_bind':
      return VERIFICATION_CODE_SCENARIOS.PHONE_BIND;
    case 'phone_change_old':
      return VERIFICATION_CODE_SCENARIOS.PHONE_CHANGE_OLD;
    case 'phone_change_new':
      return VERIFICATION_CODE_SCENARIOS.PHONE_CHANGE_NEW;
    case 'phone_unbind':
      return VERIFICATION_CODE_SCENARIOS.PHONE_UNBIND;
    case 'email':
      return VERIFICATION_CODE_SCENARIOS.EMAIL;
    case 'email_login':
      return VERIFICATION_CODE_SCENARIOS.EMAIL_LOGIN;
    case 'email_bind':
      return VERIFICATION_CODE_SCENARIOS.EMAIL_BIND;
    case 'email_unbind':
      return VERIFICATION_CODE_SCENARIOS.EMAIL_UNBIND;
    case 'email_change_old':
      return VERIFICATION_CODE_SCENARIOS.EMAIL_CHANGE_OLD;
    case 'email_change_new':
      return VERIFICATION_CODE_SCENARIOS.EMAIL_CHANGE_NEW;
  }
}

function getSmsType(scenario: string): SmsType {
  switch (scenario) {
    case VERIFICATION_CODE_SCENARIOS.PHONE:
      return 'phone';
    case VERIFICATION_CODE_SCENARIOS.PHONE_LOGIN:
      return 'phone_login';
    case VERIFICATION_CODE_SCENARIOS.PHONE_BIND:
      return 'phone_bind';
    case VERIFICATION_CODE_SCENARIOS.PHONE_CHANGE_OLD:
      return 'phone_change_old';
    case VERIFICATION_CODE_SCENARIOS.PHONE_CHANGE_NEW:
      return 'phone_change_new';
    case VERIFICATION_CODE_SCENARIOS.PHONE_UNBIND:
      return 'phone_unbind';
    case VERIFICATION_CODE_SCENARIOS.EMAIL:
      return 'email';
    case VERIFICATION_CODE_SCENARIOS.EMAIL_LOGIN:
      return 'email_login';
    case VERIFICATION_CODE_SCENARIOS.EMAIL_BIND:
      return 'email_bind';
    case VERIFICATION_CODE_SCENARIOS.EMAIL_UNBIND:
      return 'email_unbind';
    case VERIFICATION_CODE_SCENARIOS.EMAIL_CHANGE_OLD:
      return 'email_change_old';
    case VERIFICATION_CODE_SCENARIOS.EMAIL_CHANGE_NEW:
      return 'email_change_new';
    default:
      return 'phone';
  }
}

function getProviderType(smsType: SmsType): VerificationProviderType {
  switch (smsType) {
    case 'phone':
    case 'phone_login':
    case 'phone_bind':
    case 'phone_change_old':
    case 'phone_change_new':
    case 'phone_unbind':
      return VERIFICATION_PROVIDER_TYPES.PHONE;
    case 'email':
    case 'email_login':
    case 'email_bind':
    case 'email_unbind':
    case 'email_change_old':
    case 'email_change_new':
      return VERIFICATION_PROVIDER_TYPES.EMAIL;
  }
}

function toVerificationRecord(record: {
  providerId: string;
  scenario: string;
  code: string;
  flowToken: string | null;
  createdAt: Date;
  expiresAt: Date;
  userUid: string | null;
  providerType: string;
}): TVerification_Codes {
  return {
    id: record.providerId,
    smsType: getSmsType(record.scenario),
    code: record.code,
    uid: record.flowToken || '',
    createdAt: record.createdAt,
    expiresAt: record.expiresAt,
    userUid: record.userUid,
    providerType: record.providerType as VerificationProviderType
  };
}

async function findByMetadataUid(uid: string) {
  const result = await prisma.verificationCodes.findFirst({
    where: {
      flowToken: uid,
      expiresAt: {
        gt: new Date()
      }
    }
  });

  if (!result) return null;

  return toVerificationRecord({
    providerId: result.providerId,
    scenario: result.scenario,
    code: result.code,
    flowToken: result.flowToken,
    createdAt: result.createdAt,
    expiresAt: result.expiresAt,
    userUid: result.userUid,
    providerType: result.providerType
  });
}

export async function addOrUpdateCode({
  id,
  smsType,
  code,
  userUid = null
}: {
  id: string;
  code: string;
  smsType: SmsType;
  userUid?: string | null;
}) {
  const scenario = getScenario(smsType);
  const providerType = getProviderType(smsType);
  const flowToken = v4();

  return prisma.verificationCodes.upsert({
    where: {
      scenario_providerType_providerId: {
        scenario,
        providerType,
        providerId: id
      }
    },
    create: {
      userUid,
      scenario,
      providerType,
      providerId: id,
      code,
      flowToken,
      expiresAt: buildExpiresAt(VERIFICATION_EXPIRE_MS),
      metadata: {}
    },
    update: {
      userUid,
      code,
      flowToken,
      expiresAt: buildExpiresAt(VERIFICATION_EXPIRE_MS),
      metadata: {}
    }
  });
}

export async function checkSendable({ id, smsType }: { id: string; smsType: SmsType }) {
  const scenario = getScenario(smsType);
  const providerType = getProviderType(smsType);
  const cutoff = new Date(Date.now() - 60 * 1000);

  const result = await prisma.verificationCodes.findFirst({
    where: {
      scenario,
      providerType,
      providerId: id,
      expiresAt: {
        gt: cutoff
      }
    }
  });

  return !result;
}

export async function checkCode({
  id,
  smsType,
  code
}: {
  id: string;
  code: string;
  smsType: SmsType;
}) {
  const scenario = getScenario(smsType);
  const providerType = getProviderType(smsType);
  const result = await prisma.verificationCodes.findFirst({
    where: {
      scenario,
      providerType,
      providerId: id,
      code,
      expiresAt: {
        gt: new Date()
      }
    }
  });

  return result
    ? toVerificationRecord({
        providerId: result.providerId,
        scenario: result.scenario,
        code: result.code,
        flowToken: result.flowToken,
        createdAt: result.createdAt,
        expiresAt: result.expiresAt,
        userUid: result.userUid,
        providerType: result.providerType
      })
    : null;
}

export async function getInfoByUid({ uid }: { uid: string }) {
  return findByMetadataUid(uid);
}

export async function deleteByUid({ uid }: { uid: string }) {
  return prisma.verificationCodes.updateMany({
    where: {
      flowToken: uid,
      expiresAt: {
        gt: new Date()
      }
    },
    data: {
      expiresAt: new Date()
    }
  });
}
