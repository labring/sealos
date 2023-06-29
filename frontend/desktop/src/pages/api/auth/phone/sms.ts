import { NextApiRequest, NextApiResponse } from 'next';
// import twilio from 'twilio';
//@ts-ignore
import Dysmsapi, * as dysmsapi from '@alicloud/dysmsapi20170525'
//@ts-ignore
import * as OpenApi from '@alicloud/openapi-client'
//@ts-ignore
import * as Util from '@alicloud/tea-util'
import { jsonRes } from '@/services/backend/response';
import { addOrUpdateCode, checkSendable } from '@/services/backend/db/verifyCode';
import { enableSms } from '@/services/enable';
const accessKeyId = process.env.ALI_ACCESS_KEY_ID
const accessKeySecret = process.env.ALI_ACCESS_KEY_SECRET
const templateCode = process.env.ALI_TEMPLATE_CODE
const signName = process.env.ALI_SIGN_NAME

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if(!enableSms()){
      throw new Error('SMS is not enabled')
    }
    const { phoneNumbers } = req.body;
    if (!await checkSendable(phoneNumbers)) {
      return jsonRes(res, {
        message: 'SMS already sent',
        code: 400
      })
    }

    // randomly generate six bit check code
    const code = Math.floor(Math.random() * 900000 + 100000).toString()
    const sendSmsRequest = new dysmsapi.SendSmsRequest({
      phoneNumbers,
      signName,
      templateCode,
      templateParam: `{"code":${code}}`,
    })
    const config = new OpenApi.Config({
      accessKeyId,
      accessKeySecret,
    })

    const client = new Dysmsapi(config)
    const runtime = new Util.RuntimeOptions({})
    const result = await client.sendSmsWithOptions(sendSmsRequest, runtime)
    if (result.body.code !== 'OK') {
      jsonRes(res, {
        message: `ALISMS_ERROR: ${result.body.message}`
      })
      return
    }
    // update cache
    await addOrUpdateCode({ phone: phoneNumbers, code })
    return jsonRes(res, {
      message: 'SMS sent',
      code: 200
    })

  } catch (error) {
    console.log(error)
    jsonRes(res, {
      message: 'Failed to send SMS'
    })
  }

}