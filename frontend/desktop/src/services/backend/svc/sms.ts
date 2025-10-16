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
    try {
      const code = await smsReq(phone);
      return sendSmsCodeResp(smsType, phone, code)(res);
    } catch (error) {
      console.error('sendPhoneCodeSvc failed:', error);
      return jsonRes(res, {
        message: 'SMS sending failed',
        code: 500
      });
    }
  };
export const sendEmailCodeSvc =
  (email: string, smsType: SmsType) => async (res: NextApiResponse) => {
    try {
      const code = await emailSmsReq(email);
      return sendSmsCodeResp(smsType, email, code)(res);
    } catch (error) {
      console.error('sendEmailCodeSvc failed:', error);
      return jsonRes(res, {
        message: 'Email sending failed',
        code: 500
      });
    }
  };
