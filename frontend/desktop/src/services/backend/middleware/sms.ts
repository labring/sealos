import { jsonRes } from '../response';
import { NextApiRequest, NextApiResponse } from 'next';
import {
  SmsType,
  TVerification_Codes,
  checkCode,
  checkSendable,
  deleteByUid,
  getInfoByUid
} from '../db/verifyCode';
import { isEmail } from '@/utils/crypto';
import { EMAIL_STATUS } from '@/types/response/email';

export const filterPhoneParams = async (
  req: NextApiRequest,
  res: NextApiResponse,
  next: (data: { phoneNumbers: string }) => void
) => {
  const { id: phoneNumbers } = req.body as { id?: string };
  if (!phoneNumbers)
    return jsonRes(res, {
      message: 'phoneNumbers is invalid',
      code: 400
    });
  await Promise.resolve(next({ phoneNumbers }));
};
export const filterEmailParams = async (
  req: NextApiRequest,
  res: NextApiResponse,
  next: (data: { email: string }) => void
) => {
  const { id: email } = req.body as { id?: string };
  if (!email || !isEmail(email))
    return jsonRes(res, {
      message: EMAIL_STATUS.INVALID_PARAMS,
      code: 400
    });
  await Promise.resolve(next({ email }));
};
export const filterPhoneVerifyParams = (
  req: NextApiRequest,
  res: NextApiResponse,
  next: (data: { phoneNumbers: string; code: string; inviterId?: string }) => void
) =>
  filterPhoneParams(req, res, async (data) => {
    const { code, inviterId } = req.body as {
      code?: string;
      inviterId?: string;
    };
    if (!code)
      return jsonRes(res, {
        message: 'code is invalid',
        code: 400
      });

    await Promise.resolve(
      next({
        ...data,
        code,
        inviterId
      })
    );
  });
export const filterEmailVerifyParams = (
  req: NextApiRequest,
  res: NextApiResponse,
  next: (data: { email: string; code: string; inviterId?: string }) => void
) =>
  filterEmailParams(req, res, async (data) => {
    const { code, inviterId } = req.body as {
      code?: string;
      inviterId?: string;
    };
    if (!code)
      return jsonRes(res, {
        message: EMAIL_STATUS.INVALID_PARAMS,
        code: 400
      });
    await Promise.resolve(
      next({
        ...data,
        code,
        inviterId
      })
    );
  });

export const filterCodeUid = async (
  req: NextApiRequest,
  res: NextApiResponse,
  next: (data: { uid: string }) => void
) => {
  const { uid } = req.body as { uid?: string };
  if (!uid)
    return jsonRes(res, {
      message: 'uid is invalid',
      code: 400
    });
  return await Promise.resolve(
    next({
      uid
    })
  );
};

export const filterCf = async (req: NextApiRequest, res: NextApiResponse, next: () => void) => {
  const { cfToken } = req.body as { cfToken?: string };
  const verifyEndpoint = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
  const secret = process.env.CF_SECRET_KEY;
  if (secret) {
    if (!cfToken)
      return jsonRes(res, {
        message: 'cfToken is invalid',
        code: 400
      });
    const verifyRes = await fetch(verifyEndpoint, {
      method: 'POST',
      body: `secret=${encodeURIComponent(secret)}&response=${encodeURIComponent(cfToken)}`,
      headers: {
        'content-type': 'application/x-www-form-urlencoded'
      }
    });
    const data = await verifyRes.json();
    if (!data.success)
      return jsonRes(res, {
        message: 'cfToken is invalid',
        code: 400
      });
  }
  return await Promise.resolve(next());
};

// once code
export const verifyCodeUidGuard =
  (uid: string) =>
  async (res: NextApiResponse, next: (d: { smsInfo: TVerification_Codes }) => void) => {
    const oldSmsInfo = await getInfoByUid({ uid });
    if (!oldSmsInfo)
      return jsonRes(res, {
        message: 'uid is expired',
        code: 409
      });
    await Promise.resolve(next({ smsInfo: oldSmsInfo }));
    // once code
    await deleteByUid({ uid: oldSmsInfo.uid });
  };

export const verifySmsCodeGuard =
  (smsType: SmsType) =>
  (id: string, code: string) =>
  async (res: NextApiResponse, next: (d: { smsInfo: TVerification_Codes }) => void) => {
    const smsInfo = await checkCode({ id, smsType, code });
    if (!smsInfo) {
      return jsonRes(res, {
        message: 'SMS code is wrong',
        code: 409
      });
    }
    return await Promise.resolve(next({ smsInfo }));
  };

export const verifyPhoneCodeGuard = verifySmsCodeGuard('phone');
export const verifyEmailCodeGuard = verifySmsCodeGuard('email');

// need to get queryParam from after filter
export const sendSmsCodeGuard =
  (smsType: SmsType) => (id: string) => async (res: NextApiResponse, next?: () => void) => {
    if (!(await checkSendable({ smsType, id }))) {
      return jsonRes(res, {
        message: 'code already sent',
        code: 409
      });
    }
    await Promise.resolve(next?.());
  };
export const sendNewSmsCodeGuard =
  (smsType: SmsType) =>
  (codeUid: string, smsId: string) =>
  (res: NextApiResponse, next: (d: { smsInfo: TVerification_Codes }) => void) =>
    sendSmsCodeGuard(smsType)(smsId)(res, async () => {
      const oldSmsInfo = await getInfoByUid({ uid: codeUid });
      if (!oldSmsInfo)
        return jsonRes(res, {
          message: 'uid is expired',
          code: 409
        });
      await Promise.resolve(next({ smsInfo: oldSmsInfo }));
    });

export const sendPhoneCodeGuard = sendSmsCodeGuard('phone');
export const sendEmailCodeGuard = sendSmsCodeGuard('email');

export const sendNewPhoneCodeGuard = sendNewSmsCodeGuard('phone');
export const sendNewEmailCodeGuard = sendNewSmsCodeGuard('email');
