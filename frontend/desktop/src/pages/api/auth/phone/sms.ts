import { NextApiRequest, NextApiResponse } from 'next';
// import twilio from 'twilio';
//@ts-ignore
import Dysmsapi, * as dysmsapi from '@alicloud/dysmsapi20170525';
//@ts-ignore
import * as OpenApi from '@alicloud/openapi-client';
//@ts-ignore
import * as Util from '@alicloud/tea-util';
import { jsonRes } from '@/services/backend/response';
import { addOrUpdateCode, checkSendable } from '@/services/backend/db/verifyCode';
import { enableSms } from '@/services/enable';
import { retrySerially } from '@/utils/tools';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const accessKeyId = global.AppConfig?.desktop.auth.idp.sms?.ali?.accessKeyID!;
  const accessKeySecret = global.AppConfig?.desktop.auth.idp.sms?.ali?.accessKeySecret!;
  const templateCode = global.AppConfig?.desktop.auth.idp.sms?.ali?.templateCode!;
  const signName = global.AppConfig?.desktop.auth.idp.sms?.ali?.signName!;
  const cfSiteKey = global.AppConfig?.common.cfSiteKey!;
  const cfVerifyEndpoint = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
  try {
    if (!enableSms()) {
      throw new Error('SMS is not enabled');
    }
    const { phoneNumbers, cfToken } = req.body as { phoneNumbers?: string; cfToken?: string };

    if (cfSiteKey) {
      if (!cfToken)
        return jsonRes(res, {
          message: 'cfToken is invalid',
          code: 400
        });
      const verifyRes = await fetch(cfVerifyEndpoint, {
        method: 'POST',
        body: `secret=${encodeURIComponent(cfSiteKey)}&response=${encodeURIComponent(cfToken)}`,
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
    if (!phoneNumbers)
      return jsonRes(res, {
        message: 'phoneNumbers is invalid',
        code: 400
      });
    if (!(await checkSendable({ phone: phoneNumbers }))) {
      return jsonRes(res, {
        message: 'code already sent',
        code: 400
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
    const result = await retrySerially(async () => {
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
    await addOrUpdateCode({ phone: phoneNumbers, code });
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
