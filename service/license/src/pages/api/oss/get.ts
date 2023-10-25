import { authSession } from '@/services/backend/auth';
import { getOssUrl } from '@/services/backend/db/oss';
import { jsonRes } from '@/services/backend/response';
import type { NextApiRequest, NextApiResponse } from 'next';
const OSS = require('ali-oss');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { fileName } = req.query as { fileName: string };

    const userInfo = await authSession(req.headers);
    if (!userInfo) return jsonRes(res, { code: 401, message: 'token verify error' });

    const url = await getOssUrl({ fileName });

    return jsonRes(res, {
      data: url
    });
  } catch (error) {
    console.error(error);
    jsonRes(res, { code: 500, data: error });
  }
}
