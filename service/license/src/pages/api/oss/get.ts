import { authSession } from '@/services/backend/auth';
import { jsonRes } from '@/services/backend/response';
import type { NextApiRequest, NextApiResponse } from 'next';
const OSS = require('ali-oss');
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { fileName } = req.body as { fileName: string };

    const userInfo = await authSession(req.headers);
    if (!userInfo) return jsonRes(res, { code: 401, message: 'token verify error' });

    const client = new OSS({
      region: 'oss-cn-hangzhou',
      accessKeyId: process.env.ALI_OSS_KEY_ID,
      accessKeySecret: process.env.ALI_OSS_KEY_SECRET,
      bucket: 'sealos-io'
    });
    // 生成用于下载文件的签名URL。
    const url = client.signatureUrl(fileName, {
      // expires: 30 * 60  // 默认30分钟 最长60分钟
    });

    return jsonRes(res, {
      data: url
    });
  } catch (error) {
    console.error(error);
    jsonRes(res, { code: 500, data: error });
  }
}
