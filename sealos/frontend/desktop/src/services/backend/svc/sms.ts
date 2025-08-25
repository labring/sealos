import { NextApiResponse } from 'next';
import { addOrUpdateCode, SmsType } from '../db/verifyCode';
import { jsonRes } from '../response';
import { captchaReq, emailSmsReq, smsReq } from '../sms';

export const sendSmsCodeResp =
  (smsType: SmsType, id: string, code: string) =>
  async (res: NextApiResponse, next?: () => void) => {
    await addOrUpdateCode({ id, smsType, code });
    return jsonRes(res, {
      message: 'successfully',
      code: 200
    });
  };
export const sendPhoneCodeSvc =
  (phone: string, smsType: SmsType) => async (res: NextApiResponse) => {
    const code = await smsReq(phone);
    return sendSmsCodeResp(smsType, phone, code)(res);
  };
export const sendEmailCodeSvc =
  (email: string, smsType: SmsType) => async (res: NextApiResponse) => {
    const code = await emailSmsReq(email);
    return sendSmsCodeResp(smsType, email, code)(res);
  };
