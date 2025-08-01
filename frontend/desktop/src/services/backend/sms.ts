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

  const getLocalizedContent = (content: {
    meta: {
      subject: string;
      language: 'zh' | 'en';
    };
    heading: string;
    slogan: string;
    title: {
      content: [string, string, string];
      link: string;
    };
    code: string;
    footer: string;
  }) => {
    return `
<!DOCTYPE html>
<html lang="${content.meta.language}" style="box-sizing: border-box;font-family: system-ui, sans-serif;font-weight: normal;">
  <head style="box-sizing: border-box;font-family: system-ui, sans-serif;font-weight: normal;">
    <meta charset="UTF-8" style="box-sizing: border-box;font-family: system-ui, sans-serif;font-weight: normal;">
    <meta name="viewport" content="width=device-width, initial-scale=1.0" style="box-sizing: border-box;font-family: system-ui, sans-serif;font-weight: normal;">
    <title style="box-sizing: border-box;font-family: system-ui, sans-serif;font-weight: normal;">${content.meta.subject}</title>
    
  </head>
  <body style="box-sizing: border-box;font-family: system-ui, sans-serif;font-weight: normal;margin: 0;padding: 0;">
    <div class="card-container" style="box-sizing: border-box;font-family: system-ui, sans-serif;font-weight: normal;margin: 0 auto;display: table;table-layout: auto;width: 100%;max-width: 540px;background-color: #ffffff;">
      <div class="header-container" style="box-sizing: border-box;font-family: system-ui, sans-serif;font-weight: normal;display: table-caption;width: 100%;max-width: 540px;align-items: center;gap: 20px;padding-left: 44px;padding-right: 44px;padding-top: 44px;padding-bottom: 50px;">
        <div class="logo-container" style="box-sizing: border-box;font-family: system-ui, sans-serif;font-weight: normal;display: table-cell;vertical-align: middle;width: 48px;height: 48px;padding-right: 20px;line-height: 1;">
          <img src="https://objectstorageapi.usw.sealos.io/3n31wssp-sealos-assets/sealos-logo@128.png" width="48" height="48" alt="Sealos Logo" style="box-sizing: border-box;font-family: system-ui, sans-serif;font-weight: normal;">
        </div>
        <div class="header-content" style="box-sizing: border-box;font-family: system-ui, sans-serif;font-weight: normal;display: table-cell;vertical-align: middle;">
          <h1 class="header-title" style="box-sizing: border-box;font-family: system-ui, sans-serif;font-weight: 600;margin: 0;padding: 0;color: #000000;font-size: 20px;line-height: 1;margin-bottom: 4px;">${content.heading}</h1>
          <span class="header-description" style="box-sizing: border-box;font-family: system-ui, sans-serif;font-weight: 400;color: #a1a1aa;font-size: 12px;line-height: 1;">${content.slogan}</span>
        </div>
      </div>

      <div class="content-container" style="box-sizing: border-box;font-family: system-ui, sans-serif;font-weight: normal;padding-left: 44px;padding-right: 44px;padding-bottom: 50px;">
        <h2 class="content-title" style="box-sizing: border-box;font-family: system-ui, sans-serif;font-weight: 500;margin: 0;padding: 0;color: #000;font-size: 20px;line-height: 24px;margin-bottom: 16px;">
          ${content.title.content[0]}
          <a class="content-title-highlight" href="${content.title.link}" style="box-sizing: border-box;font-family: system-ui, sans-serif;font-weight: 500;color: #000;font-size: 20px;line-height: 24px;text-decoration-line: underline;text-underline-position: from-font;">
            ${content.title.content[1]}</a
          >
          ${content.title.content[2]}
        </h2>
        <span class="content-code" style="box-sizing: border-box;font-family: system-ui, sans-serif;font-weight: 700;color: #000;font-size: 40px;letter-spacing: 24px;">${content.code}</span>
      </div>

      <p class="footer-description" style="box-sizing: border-box;font-family: system-ui, sans-serif;font-weight: 400;margin: 0;padding: 0;color: #71717a;font-size: 16px;line-height: 24px;padding-left: 44px;padding-right: 44px;padding-bottom: 44px;">${content.footer}</p>
    </div>
  </body>
</html>

`;
  };
  const subjectMap = {
    zh: '【Sealos】验证码',
    en: '【Sealos】Verification Code'
  } as const;
  const htmlMap = {
    zh: getLocalizedContent({
      meta: {
        subject: subjectMap['zh'],
        language: 'zh'
      },
      heading: 'Sealos',
      slogan: '让用云像 PC 一样简单',
      title: {
        content: ['您好，您的验证码为：', '', ''],
        link: ''
      },
      code: code,
      footer: '请复制粘贴该验证码以登录 Sealos。 <br /> 如果您并非准备登录，请忽略此邮件。'
    }),
    en: getLocalizedContent({
      meta: {
        subject: subjectMap['en'],
        language: 'en'
      },
      heading: 'Sealos',
      slogan: 'Enterprise-grade infrastructure as simple as your desktop',
      title: {
        content: ['Your', 'Sealos', 'verification code:'],
        link: 'https://sealos.io'
      },
      code: code,
      footer:
        "Copy and paste the temporary verification code to sign in. <br /> If you didn't try to sign in, you can safely ignore this email."
    })
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
