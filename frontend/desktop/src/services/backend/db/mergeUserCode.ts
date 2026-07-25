import { v4 } from 'uuid';
import { ProviderType } from 'prisma/global/generated/client';
import { prisma } from './init';
import {
  VERIFICATION_CODE_SCENARIOS,
  VERIFICATION_PROVIDER_TYPES,
  type VerificationProviderType
} from '@/constants/verification';

export type TMergeUserCode = {
  code: string;
  providerId: string;
  providerType: ProviderType;
  uid: string;
  createdAt: Date;
};

const MERGE_USER_EXPIRE_MS = 60 * 1000;

function getVerificationProviderType(providerType: ProviderType): VerificationProviderType {
  switch (providerType) {
    case 'PHONE':
      return VERIFICATION_PROVIDER_TYPES.PHONE;
    case 'GITHUB':
      return VERIFICATION_PROVIDER_TYPES.GITHUB;
    case 'WECHAT':
      return VERIFICATION_PROVIDER_TYPES.WECHAT;
    case 'GOOGLE':
      return VERIFICATION_PROVIDER_TYPES.GOOGLE;
    case 'PASSWORD':
      return VERIFICATION_PROVIDER_TYPES.PASSWORD;
    case 'OAUTH2':
      return VERIFICATION_PROVIDER_TYPES.OAUTH2;
    case 'EMAIL':
      return VERIFICATION_PROVIDER_TYPES.EMAIL;
  }
}

function toMergeUserCode(record: {
  providerId: string;
  providerType: string;
  code: string;
  flowToken: string | null;
  createdAt: Date;
}): TMergeUserCode {
  return {
    code: record.code,
    providerId: record.providerId,
    providerType: record.providerType as ProviderType,
    uid: record.flowToken || '',
    createdAt: record.createdAt
  };
}

export async function addOrUpdateCode({
  providerId,
  providerType,
  code
}: {
  providerId: string;
  providerType: ProviderType;
  code: string;
}) {
  const verificationProviderType = getVerificationProviderType(providerType);
  const flowToken = v4();

  return prisma.verificationCodes.upsert({
    where: {
      scenario_providerType_providerId: {
        scenario: VERIFICATION_CODE_SCENARIOS.MERGE_USER,
        providerType: verificationProviderType,
        providerId
      }
    },
    create: {
      userUid: null,
      scenario: VERIFICATION_CODE_SCENARIOS.MERGE_USER,
      providerType: verificationProviderType,
      providerId,
      code,
      flowToken,
      expiresAt: new Date(Date.now() + MERGE_USER_EXPIRE_MS),
      metadata: {}
    },
    update: {
      code,
      flowToken,
      expiresAt: new Date(Date.now() + MERGE_USER_EXPIRE_MS),
      metadata: {}
    }
  });
}

export async function checkCode({
  providerType,
  code
}: {
  providerType: ProviderType;
  code: string;
}) {
  const verificationProviderType = getVerificationProviderType(providerType);

  const result = await prisma.verificationCodes.findFirst({
    where: {
      scenario: VERIFICATION_CODE_SCENARIOS.MERGE_USER,
      providerType: verificationProviderType,
      code,
      expiresAt: {
        gt: new Date()
      }
    }
  });

  return result
    ? toMergeUserCode({
        providerId: result.providerId,
        providerType: result.providerType,
        code: result.code,
        flowToken: result.flowToken,
        createdAt: result.createdAt
      })
    : null;
}

export async function deleteByUid({ uid }: { uid: string }) {
  return prisma.verificationCodes.updateMany({
    where: {
      scenario: VERIFICATION_CODE_SCENARIOS.MERGE_USER,
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
