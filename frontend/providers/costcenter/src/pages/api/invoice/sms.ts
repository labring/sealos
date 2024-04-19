import { NextApiRequest, NextApiResponse } from 'next';
import Dysmsapi, * as dysmsapi from '@alicloud/dysmsapi20170525';
import * as OpenApi from '@alicloud/openapi-client';
import * as Util from '@alicloud/tea-util';
import { jsonRes } from '@/service/backend/response';
import { addOrUpdateCode, checkSendable } from '@/service/backend/db/verifyCode';
import { getClientIPFromRequest, retrySerially } from '@/utils/tools';
import { authSession } from '@/service/backend/auth';
import { enableInvoice } from '@/service/enabled';
import * as process from 'process';
const accessKeyId = process.env.ALI_ACCESS_KEY_ID;
const accessKeySecret = process.env.ALI_ACCESS_KEY_SECRET;
const templateCode = process.env.ALI_TEMPLATE_CODE;
const signName = process.env.ALI_SIGN_NAME;
const requestTimestamps: Record<string, number> = {};
function checkRequestFrequency(ipAddress: string) {
  const currentTime = Date.now();
  const lastRequestTime = requestTimestamps[ipAddress] || 0;
  const timeDiff = currentTime - lastRequestTime;

  const requestInterval = 60 * 1000;

  if (timeDiff < requestInterval) {
    return false;
  } else {
    requestTimestamps[ipAddress] = currentTime;
    return true;
  }
}
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (!enableInvoice()) {
      throw new Error('invoice is not enabled');
    }
    const kc = await authSession(req.headers);
    const user = kc.getCurrentUser();
    if (user === null) {
      return jsonRes(res, { code: 401, message: 'user null' });
    }
    const { phoneNumbers } = req.body;
    let ip = getClientIPFromRequest(req);

    if (!ip) {
      if (process.env.NODE_ENV === 'development') ip = '127.0.0.1';
      else
        return jsonRes(res, {
          message: 'The IP is null',
          code: 403
        });
    }
    if (
      !(await checkSendable({
        phone: phoneNumbers,
        ip
      }))
    ) {
      return jsonRes(res, {
        message: 'Code already sent',
        code: 429
      });
    }

    // randomly generate six bit check code
    const code = Math.floor(Math.random() * 900000 + 100000).toString();
    const sendSmsRequest = new dysmsapi.SendSmsRequest({
      phoneNumbers,
      signName,
      templateCode,
      templateParam: `{"code":${code}}`
    });
    const config = new OpenApi.Config({
      accessKeyId,
      accessKeySecret
    });

    const client = new Dysmsapi(config);
    const runtime = new Util.RuntimeOptions({});
    await retrySerially(async () => {
      try {
        const _result = await client.sendSmsWithOptions(sendSmsRequest, runtime);

        if (!_result) {
          throw new Error('sms result is null');
        }
        if (_result.statusCode !== 200) {
          throw new Error(`sms result status code is ${_result.statusCode}
          ${_result.body}
          ${phoneNumbers},
          ${new Date()}
          `);
        }
        if (_result.body.code !== 'OK') {
          throw new Error(`
          ${_result.body.message} 
          ${phoneNumbers}, 
          ${new Date()}`);
        }
        return _result;
      } catch (error) {
        return Promise.reject(error);
      }
    }, 3);

    // update cache
    await addOrUpdateCode({ phone: phoneNumbers, code, ip });
    return jsonRes(res, {
      message: 'successfully',
      code: 200
    });
  } catch (error) {
    console.log(error);
    jsonRes(res, {
      message: 'Failed to send code',
      code: 500
    });
  }
}
