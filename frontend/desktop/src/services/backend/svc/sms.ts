import { NextApiResponse } from 'next';
import { jsonRes } from '../response';
import { addOrUpdateCode, SmsType } from '../db/verifyCode';
import { emailSmsReq, smsReq } from '../sms';

export const sendSmsCodeResp =
  (smsType: SmsType, id: string, code: string) =>
  async (res: NextApiResponse, next?: () => void) => {
    await addOrUpdateCode({ id, smsType, code });
    return jsonRes(res, {
      message: 'successfully',
      code: 200
    });
  };
export const sendPhoneCodeSvc = (phone: string) => async (res: NextApiResponse) => {
  console.log('svc!');
  const code = await smsReq(phone);
  return sendSmsCodeResp('phone', phone, code)(res);
};
export const sendEmailCodeSvc = (email: string) => async (res: NextApiResponse) => {
  const code = await emailSmsReq(email);
  return sendSmsCodeResp('email', email, code)(res);
};
