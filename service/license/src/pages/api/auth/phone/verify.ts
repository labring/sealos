import { NextApiRequest, NextApiResponse } from 'next';
import { jsonRes } from '@/services/backend/response';
import { Session } from '@/types';
import { checkCode } from '@/services/backend/db/verifyCode';
import { getOauthRes } from '@/services/backend/oauth';
import { enableSms } from '@/services/enable';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (!enableSms()) {
      throw new Error('sms client is not defined');
    }
    const { phoneNumbers, code } = req.body;
    if (!(await checkCode({ phone: phoneNumbers, code }))) {
      return jsonRes(res, {
        message: 'SMS code is wrong',
        code: 400
      });
    }
    const data = await getOauthRes({
      provider: 'phone',
      id: phoneNumbers,
      name: phoneNumbers,
      avatar_url: ''
    });

    return jsonRes<Session>(res, {
      data,
      code: 200,
      message: 'Successfully'
    });
  } catch (error) {
    console.log(error);
    jsonRes(res, {
      message: 'Failed to authenticate with phone',
      code: 400
    });
  }
}
