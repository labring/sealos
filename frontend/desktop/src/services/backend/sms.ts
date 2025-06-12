//@ts-ignore
import { getAppConfig } from '@/pages/api/platform/getAppConfig';
import { retrySerially } from '@/utils/tools';
import Dysmsapi, * as dysmsapi from '@alicloud/dysmsapi20170525';
import * as $tea from '@alicloud/tea-typescript';
import OpenApi, * as $OpenApi from '@alicloud/openapi-client';
import Utils, * as $Util from '@alicloud/tea-util';
import Captcha, * as $Captcha from '@alicloud/captcha20230305';
import nodemailer from 'nodemailer';
const getTransporter = () => {
  if (!global.nodemailer) {
    const emailConfig = global.AppConfig.desktop.auth.idp.email;
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
  const config = new $OpenApi.Config({
    accessKeyId,
    accessKeySecret
  });

  const client = new Dysmsapi(config);
  const runtime = new $Util.RuntimeOptions({});
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

export const captchaReq = async ({ captchaVerifyParam }: { captchaVerifyParam?: string }) => {
  // for dev
  const captchaConfig = global.AppConfig.desktop.auth.captcha;
  if (!captchaConfig?.enabled) throw Error('config error');
  const aliConfig = global.AppConfig.desktop.auth.captcha?.ali;
  if (!aliConfig) throw Error('config error');
  const { sceneId, accessKeyID: accessKeyId, accessKeySecret = '', endpoint } = aliConfig;
  const captchaRequest = new $Captcha.VerifyIntelligentCaptchaRequest({});
  captchaRequest.captchaVerifyParam = captchaVerifyParam;
  captchaRequest.sceneId = sceneId;
  const config = new $OpenApi.Config({
    accessKeyId,
    accessKeySecret,
    endpoint
  });
  const client = new Captcha(config);
  const runtime = new $Util.RuntimeOptions({});
  return await retrySerially(async () => {
    try {
      const _result = await client.verifyIntelligentCaptchaWithOptions(captchaRequest, runtime);
      if (!_result) {
        throw new Error('captcha result is null');
      }
      if (_result.body.code !== 'Success' || !_result.body.success) {
        throw new Error(`
				${_result.body.message}
				${new Date()}`);
      }
      return _result.body.result;
    } catch (error) {
      return Promise.reject(error);
    }
  }, 3);
};
export const emailSmsReq = async (email: string) => {
  const emailConfig = global.AppConfig.desktop.auth.idp.email;
  if (!emailConfig) throw Error('config error');

  const code = Math.floor(Math.random() * 900000 + 100000).toString();
  const transporter = getTransporter();
  const language = emailConfig.language === 'zh' ? 'zh' : 'en';

  const getLocalizedContent = (content: string, subject: string, language: 'zh' | 'en') => {
    return `
      <!DOCTYPE html>
      <html lang="${language}">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${subject}</title>
          <style>
              body {
                  font-family: Arial, sans-serif;
                  background-color: #f0f0f0;
              }
              .container {
                  max-width: 400px;
                  margin: 50px auto;
                  padding: 20px;
                  background-color: #fff;
                  border-radius: 5px;
                  box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
              }
              .verification-code-title {
                  text-align: center;
              }
              .verification-code {
                  text-align: center;
                  font-size: 24px;
                  color: #333;
                  margin-bottom: 20px;
              }
          </style>
      </head>
      <body>
      <div class="container">
          ${content}
      </div>
      </body>
      </html>
    `;
  };
  const subjectMap = {
    zh: '【sealos】验证码',
    en: '【sealos】Verification Code'
  } as const;
  const htmlMap = {
    zh: getLocalizedContent(
      `
      <p>尊敬的用户，您正在进行邮箱绑定操作。请输入以下验证码完成验证。</p>
      <p class="verification-code-title">您的验证码是：</p>
      <p class="verification-code">${code}</p>
    `,
      subjectMap['zh'],
      'zh'
    ),
    en: getLocalizedContent(
      `
      <p>Hi, <br>
      We received a request to link this email to an account. If this was you, please use the code below to confirm your email.</p>
      <p class="verification-code-title">Your verifcation code:</p>
      <p class="verification-code">${code}</p>
      <p>If not, you can ignore this message or contact us for help.</p>
    `,
      subjectMap['en'],
      'en'
    )
  } as const;

  await retrySerially(
    () =>
      transporter.sendMail({
        from: emailConfig.user,
        to: email,
        subject: subjectMap[language],
        html: htmlMap[language]
      }),
    3
  );
  return code;
};
