import { jsonRes } from '../response';
import { NextApiRequest, NextApiResponse } from 'next';
import { SmsType, TVerification_Codes, verifyAndConsumeCode } from '../db/verifyCode';
import { isEmail } from '@/utils/crypto';
import { EMAIL_STATUS } from '@/types/response/email';
import { SemData } from '@/types/sem';
import { captchaReq } from '../sms';
import { isDisposableEmail } from 'disposable-email-domains-js';
import { AdClickData } from '@/types/adClick';
import { releaseVerificationSend, reserveVerificationSend } from '../db/verificationRateLimit';
import { consumeVerificationFlowTicket, getVerificationFlowTicket } from '../db/verificationTicket';
import { z } from 'zod';

const phoneSchema = z.string().regex(/^1[3-9]\d{9}$/);
const verificationCodeSchema = z.string().regex(/^\d{6}$/);

export const filterPhoneParams = async (
  req: NextApiRequest,
  res: NextApiResponse,
  next: (data: { phoneNumbers: string }) => void
) => {
  const parsedPhone = phoneSchema.safeParse(req.body?.id);
  if (!parsedPhone.success)
    return jsonRes(res, {
      message: 'phoneNumbers is invalid',
      code: 400
    });
  await Promise.resolve(next({ phoneNumbers: parsedPhone.data }));
};
export const filterEmailParams = async (
  req: NextApiRequest,
  res: NextApiResponse,
  next: (data: { email: string }) => void
) => {
  const email = req.body?.id;
  if (typeof email !== 'string' || !isEmail(email) || isDisposableEmail(email))
    return jsonRes(res, {
      message: EMAIL_STATUS.INVALID_PARAMS,
      code: 400
    });
  await Promise.resolve(next({ email }));
};
export const filterPhoneVerifyParams = (
  req: NextApiRequest,
  res: NextApiResponse,
  next: (data: {
    phoneNumbers: string;
    code: string;
    challengeId: string;
    semData?: SemData;
    adClickData?: AdClickData;
  }) => void
) =>
  filterPhoneParams(req, res, async (data) => {
    const { code, challengeId, semData, adClickData } = req.body as {
      code?: string;
      challengeId?: string;
      semData?: SemData;
      adClickData?: AdClickData;
    };
    const parsedCode = verificationCodeSchema.safeParse(code);
    const parsedChallengeId = z.string().uuid().safeParse(challengeId);
    if (!parsedCode.success || !parsedChallengeId.success)
      return jsonRes(res, {
        message: 'code is invalid',
        code: 400
      });

    await Promise.resolve(
      next({
        ...data,
        code: parsedCode.data,
        challengeId: parsedChallengeId.data,
        semData,
        adClickData
      })
    );
  });
export const filterEmailVerifyParams = (
  req: NextApiRequest,
  res: NextApiResponse,
  next: (data: { email: string; code: string; challengeId: string }) => void
) =>
  filterEmailParams(req, res, async (data) => {
    const { code, challengeId } = req.body as {
      code?: string;
      challengeId?: string;
    };
    const parsedCode = verificationCodeSchema.safeParse(code);
    const parsedChallengeId = z.string().uuid().safeParse(challengeId);
    if (!parsedCode.success || !parsedChallengeId.success)
      return jsonRes(res, {
        message: EMAIL_STATUS.INVALID_PARAMS,
        code: 400
      });
    await Promise.resolve(
      next({
        ...data,
        code: parsedCode.data,
        challengeId: parsedChallengeId.data
      })
    );
  });

export const filterCodeUid = async (
  req: NextApiRequest,
  res: NextApiResponse,
  next: (data: { uid: string }) => void
) => {
  const { uid } = req.body as { uid?: string };
  const parsedUid = z.string().uuid().safeParse(uid);
  if (!parsedUid.success)
    return jsonRes(res, {
      message: 'uid is invalid',
      code: 400
    });
  return await Promise.resolve(
    next({
      uid: parsedUid.data
    })
  );
};

export const filterCf = async (req: NextApiRequest, res: NextApiResponse, next: () => void) => {
  const { cfToken } = req.body as { cfToken?: string };
  const verifyEndpoint = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
  const turnstileConfig = global.AppConfig.desktop.auth.captcha?.turnstile;
  const secret = turnstileConfig?.secretKey;
  if (!!turnstileConfig?.enabled && secret) {
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
  await Promise.resolve(next());
};
export const filterCaptcha = async (
  req: NextApiRequest,
  res: NextApiResponse,
  next: () => void
) => {
  if (
    !global.AppConfig.desktop.auth.captcha?.ali?.enabled ||
    (process.env.NODE_ENV === 'development' && !process.env.DEV_CAPTCHA_ENABLED)
  ) {
    await Promise.resolve(next());
    return;
  }
  const { captchaVerifyParam } = req.body as { captchaVerifyParam?: string };
  if (!captchaVerifyParam)
    return jsonRes(res, {
      message: 'captchaVerifyParam is not provided',
      code: 400
    });
  const result = await captchaReq({
    captchaVerifyParam
  });
  if (!result?.verifyResult)
    return jsonRes(res, {
      message: 'captcha verification failed',
      data: {
        result: !!result?.verifyResult,
        code: result?.verifyCode || ''
      },
      code: 409
    });
  await Promise.resolve(next());
};
export const captchaSvc = async (req: NextApiRequest, res: NextApiResponse) => {
  if (process.env.NODE_ENV === 'development' && !process.env.DEV_CAPTCHA_ENABLED) {
    return true;
  }
  const { captchaToken } = req.body as { captchaToken?: string; sceneId?: string };

  if (!captchaToken)
    return jsonRes(res, {
      message: 'captchaToken is invalid',
      code: 400
    });
  const result = await captchaReq({
    captchaVerifyParam: captchaToken
  });
  if (!result?.verifyResult)
    return jsonRes(res, {
      message: 'captchaToken is invalid',
      data: {
        result: !!result?.verifyResult,
        code: result?.verifyCode || ''
      },
      code: 409
    });
  else
    return jsonRes(res, {
      message: 'captchaToken is valid',
      data: {
        result: result.verifyResult,
        code: result?.verifyCode || ''
      },
      code: 203
    });
};

export const verifyFlowTicketGuard =
  (uid: string, userUid: string, providerType: string) =>
  async (res: NextApiResponse, next: (d: { ticket: { oldProviderId: string } }) => void) => {
    const ticket = await getVerificationFlowTicket({
      uid,
      userUid,
      providerType,
      scenario: 'change_binding'
    });
    if (!ticket)
      return jsonRes(res, {
        message: 'Verification flow has expired',
        data: { error: 'expired_code' },
        code: 409
      });
    return Promise.resolve(next({ ticket }));
  };

export const consumeFlowTicketGuard =
  (uid: string, userUid: string, providerType: string) =>
  async (res: NextApiResponse, next: () => void) => {
    const consumed = await consumeVerificationFlowTicket({
      uid,
      userUid,
      providerType,
      scenario: 'change_binding'
    });
    if (!consumed)
      return jsonRes(res, {
        message: 'Verification flow has expired',
        data: { error: 'expired_code' },
        code: 409
      });
    return Promise.resolve(next());
  };

export const verifyCodeGuard =
  (id: string, code: string, smsType: SmsType, challengeId: string) =>
  async (res: NextApiResponse, next: (d: { smsInfo: TVerification_Codes }) => void) => {
    const result = await verifyAndConsumeCode({ id, smsType, code, challengeId });
    if (result.status === 'expired') {
      return jsonRes(res, {
        message: 'Verification code has expired',
        data: { error: 'expired_code' },
        code: 409
      });
    }
    if (result.status === 'invalid') {
      return jsonRes(res, {
        message: 'Verification code is incorrect',
        data: {
          error: 'invalid_code',
          remainingAttempts: result.remainingAttempts
        },
        code: 409
      });
    }
    if (result.status === 'locked') {
      return jsonRes(res, {
        message: 'Verification attempts exhausted',
        data: {
          error: 'attempts_exhausted',
          remainingAttempts: 0,
          retryAfter: result.retryAfter
        },
        code: 429
      });
    }
    return await Promise.resolve(next({ smsInfo: result.smsInfo }));
  };

// export const verifyPhoneCodeGuard = verifyCodeGuard('phone');
// export const verifyEmailCodeGuard = verifyCodeGuard('email');

const getProviderType = (smsType: SmsType) =>
  smsType.startsWith('phone') || smsType === 'alert_bind_phone' ? 'PHONE' : 'EMAIL';

export const sendSmsCodeGuard =
  ({ id, smsType }: { id: string; smsType: SmsType }) =>
  async (req: NextApiRequest, res: NextApiResponse, next?: () => unknown) => {
    const limit = await reserveVerificationSend(req, id, getProviderType(smsType));
    if (!limit.allowed) {
      return jsonRes(res, {
        message: 'Verification code sending is rate limited',
        data: {
          error: 'send_rate_limited',
          retryAfter: limit.retryAfter
        },
        code: 429
      });
    }

    const succeeded = await Promise.resolve(next?.());
    if (succeeded === false) {
      try {
        await releaseVerificationSend(limit.reservation);
      } catch (error) {
        console.error('Failed to release verification send rate limit:', error);
      }
    }
  };

export const sendNewSmsCodeGuard =
  ({
    smsType,
    codeUid,
    smsId,
    userUid
  }: {
    smsType: SmsType;
    codeUid: string;
    smsId: string;
    userUid: string;
  }) =>
  async (
    req: NextApiRequest,
    res: NextApiResponse,
    next: (d: { oldProviderId: string }) => unknown
  ) => {
    const ticket = await getVerificationFlowTicket({
      uid: codeUid,
      userUid,
      providerType: getProviderType(smsType),
      scenario: 'change_binding'
    });
    if (!ticket) {
      return jsonRes(res, {
        message: 'Verification flow has expired',
        data: { error: 'expired_code' },
        code: 409
      });
    }
    return sendSmsCodeGuard({ smsType, id: smsId })(req, res, () =>
      next({ oldProviderId: ticket.oldProviderId })
    );
  };
