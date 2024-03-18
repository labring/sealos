import type { NextApiRequest, NextApiResponse } from 'next';
import { jsonRes } from '@/services/backend/response';
import {
  enableGithub,
  enableWechat,
  enablePassword,
  enableSms,
  enableGoogle,
  enableWechatRecharge,
  enableLicense,
  enableRecharge,
  enableOpenWechat
} from '@/services/enable';
import { SystemEnv } from '@/types';

export default async function handler(_: NextApiRequest, res: NextApiResponse) {
  const wechat_client_id = process.env.WECHAT_CLIENT_ID || '';
  const github_client_id = process.env.GITHUB_CLIENT_ID || '';
  const google_client_id = process.env.GOOGLE_CLIENT_ID || '';
  const service_protocol_zh = process.env.SERVICE_PROTOCOL_ZH || '';
  const private_protocol_zh = process.env.PRIVATE_PROTOCOL_ZH || '';
  const service_protocol_en = process.env.SERVICE_PROTOCOL_EN || '';
  const private_protocol_en = process.env.PRIVATE_PROTOCOL_EN || '';
  const oauth_proxy = process.env.OAUTH_PROXY || '';
  const callback_url = process.env.CALLBACK_URL || '';
  const cf_sitekey = process.env.CF_SITE_KEY || '';
  const needGithub = enableGithub();
  const needWechat = enableWechat();
  const needPassword = enablePassword();
  const needSms = enableSms();
  const needGoogle = enableGoogle();
  const wechatEnabledRecharge = enableWechatRecharge();
  const licenseEnabled = enableLicense();
  const rechargeEnabled = enableRecharge();
  const guideEnabled = process.env.GUIDE_ENABLED === 'true';
  const openWechatEnabled = enableOpenWechat();
  return jsonRes<SystemEnv>(res, {
    data: {
      SEALOS_CLOUD_DOMAIN: process.env.SEALOS_CLOUD_DOMAIN || 'cloud.sealos.io',
      wechat_client_id,
      github_client_id,
      google_client_id,
      oauth_proxy,
      callback_url,
      service_protocol_zh,
      private_protocol_zh,
      service_protocol_en,
      private_protocol_en,
      needPassword,
      needSms,
      needGithub,
      needWechat,
      needGoogle,
      wechatEnabledRecharge,
      rechargeEnabled,
      licenseEnabled,
      guideEnabled,
      openWechatEnabled,
      cf_sitekey
    }
  });
}
