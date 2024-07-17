//@ts-ignore
import { getAppConfig } from '@/pages/api/platform/getAppConfig';
import { retrySerially } from '@/utils/tools';
import Dysmsapi, * as dysmsapi from '@alicloud/dysmsapi20170525';
//@ts-ignore
import * as OpenApi from '@alicloud/openapi-client';
//@ts-ignore
import * as Util from '@alicloud/tea-util';
import nodemailer from 'nodemailer';
const getTransporter = () => {
  if (!global.nodemailer) {
    const emailConfig = global.AppConfig.desktop.auth.idp.sms?.email;
    if (!emailConfig) throw Error('email transporter config error');
    const transporter = nodemailer.createTransport({
      pool: true,
      host: emailConfig.host,

      port: emailConfig.port,
      secure: true, // use TLS
      auth: {
        user: emailConfig.user,
        pass: emailConfig.password
      }
    });
    global.nodemailer = transporter;
  }
  return global.nodemailer;
};
export const smsReq = async (phoneNumbers: string) => {
  const aliConfig = global.AppConfig.desktop.auth.idp.sms?.ali;
  if (!aliConfig) throw Error('config error');
  const { signName, templateCode, accessKeyID: accessKeyId, accessKeySecret } = aliConfig;
  // for dev
  if (process.env.NODE_ENV === 'development' && !process.env.DEV_SMS_ENABLED) {
    const code = '123456';
    return code;
  }
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
  return code;
};
export const emailSmsReq = async (email: string) => {
  const emailConfig = global.AppConfig.desktop.auth.idp.sms?.email;
  if (!emailConfig) throw Error('config error');

  const code = Math.floor(Math.random() * 900000 + 100000).toString();
  const transporter = getTransporter();

  await retrySerially(
    () =>
      transporter.sendMail({
        from: emailConfig.user,
        to: email,
        subject: '【sealos】验证码',
        html: `<!DOCTYPE html>
			<html lang="en">
			<head>
				<meta charset="UTF-8">
				<meta name="viewport" content="width=device-width, initial-scale=1.0">
				<title>【sealos】验证码</title>
				<style>
					body {
						font-family: Arial, sans-serif;
						background-color: #f0f0f0;
						text-align: center;
					}
			
					.container {
						max-width: 400px;
						margin: 50px auto;
						padding: 20px;
						background-color: #fff;
						border-radius: 5px;
						box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
					}
			
					h2 {
						color: #3498db;
					}
			
					.verification-code {
						font-size: 24px;
						color: #333;
						margin-bottom: 20px;
					}
			
					.button {
						padding: 10px 20px;
						background-color: #3498db;
						color: #fff;
						border: none;
						border-radius: 5px;
						cursor: pointer;
					}
			
					.button:hover {
						background-color: #2980b9;
					}
				</style>
			</head>
			<body>
			<div class="container">
				<h2>尊敬的用户，您正在进行邮箱绑定操作。请输入以下验证码完成验证。</h2>
				<p>您的验证码是：</p>
				<p class="verification-code">${code}</p>
			</div>
			</body>
			</html>`
      }),
    3
  );
  return code;
};
