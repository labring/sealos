import {
  addOrUpdateCode as addOrUpdateVerificationCode,
  checkCode as checkVerificationCode,
  checkSendable as checkVerificationSendable,
  deleteByUid as deleteVerificationCodeByUid,
  getInfoByUid as getVerificationCodeInfoByUid,
  type TVerification_Codes
} from './verifyCode';

export type TEmailVerification_Codes = {
  email: string;
  code: string;
  uid: string;
  createdAt: Date;
};

function toEmailVerificationCode(
  verificationCode: TVerification_Codes | null
): TEmailVerification_Codes | null {
  if (!verificationCode) return null;

  return {
    email: verificationCode.id,
    code: verificationCode.code,
    uid: verificationCode.uid,
    createdAt: verificationCode.createdAt
  };
}

export async function addOrUpdateCode({ email, code }: { email: string; code: string }) {
  return addOrUpdateVerificationCode({
    id: email,
    smsType: 'email',
    code
  });
}

export async function checkSendable({ email }: { email: string }) {
  return checkVerificationSendable({
    id: email,
    smsType: 'email'
  });
}

export async function checkCode({ email, code }: { email: string; code: string }) {
  const result = await checkVerificationCode({
    id: email,
    smsType: 'email',
    code
  });

  return toEmailVerificationCode(result);
}

export async function getInfoByUid({ uid }: { uid: string }) {
  const result = await getVerificationCodeInfoByUid({ uid });
  return toEmailVerificationCode(result);
}

export async function deleteByUid({ uid }: { uid: string }) {
  return deleteVerificationCodeByUid({ uid });
}
