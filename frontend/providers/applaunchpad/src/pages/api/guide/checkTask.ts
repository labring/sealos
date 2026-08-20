import { authAppToken } from '@/services/backend/auth';
import { jsonRes } from '@/services/backend/response';
import { ApiResp } from '@/services/kubernet';
import { buildExternalUrl } from '@/utils/network-url';
import type { NextApiRequest, NextApiResponse } from 'next';
import { Config } from '@/config';

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResp>) {
  try {
    if (!Config().launchpad.features.guide) return jsonRes(res, { data: null });
    const token = await authAppToken(req.headers);
    if (!token) {
      return jsonRes(res, { code: 401, message: 'token is valid' });
    }

    const config = Config();
    const desktopUrl = buildExternalUrl({
      protocol: 'HTTP',
      host: config.cloud.desktopDomain,
      config: {
        disableHttps: config.cloud.disableHttps,
        cloudPort: config.cloud.port,
        httpPort: config.cloud.httpPort
      }
    });

    const response = await fetch(`${desktopUrl}/api/account/checkTask`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: token
      }
    });

    const result: {
      code: number;
      data: any;
      message: string;
    } = await response.json();

    if (result.code !== 200) {
      return jsonRes(res, { code: result.code, message: 'desktop api is err' });
    } else {
      return jsonRes(res, { data: result.data });
    }
  } catch (err: any) {
    console.log(err);
    jsonRes(res, {
      code: 500,
      error: err
    });
  }
}
