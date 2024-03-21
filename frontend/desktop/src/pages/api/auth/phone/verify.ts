import { NextApiRequest, NextApiResponse } from 'next';
import { jsonRes } from '@/services/backend/response';
import { checkCode } from '@/services/backend/db/verifyCode';
import { enableSms } from '@/services/enable';
import { getGlobalToken } from '@/services/backend/globalAuth';
import { ProviderType } from 'prisma/global/generated/client';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (!enableSms()) {
      throw new Error('sms client is not defined');
    }
    const { phoneNumbers, code, inviterId } = req.body;
    if (!(await checkCode({ phone: phoneNumbers, code }))) {
      return jsonRes(res, {
        message: 'SMS code is wrong',
        code: 400
      });
    }
    const data = await getGlobalToken({
      provider: ProviderType.PHONE,
      id: phoneNumbers,
      name: phoneNumbers,
      avatar_url: '',
      inviterId
    });
    return jsonRes(res, {
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
