import type { NextApiRequest, NextApiResponse } from 'next';
import { jsonRes } from '@/services/backend/response';
import type { AuthCnamePrams } from '@/api/params';
import { testCname } from '@/services/dns-resolver';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { publicDomain, customDomain } = req.body as AuthCnamePrams;

    if (!customDomain || !publicDomain) {
      return jsonRes(res, {
        code: 400,
        error: 'Missing required parameters: publicDomain or customDomain'
      });
    }

    const result = await testCname(customDomain, publicDomain).catch((e) => {
      // console.log('Invalid resolve result for CNAME record on ' + customDomain + ': ', e);
      throw e;
    });

    jsonRes(res, {
      data: result
    });
  } catch (error: any) {
    jsonRes(res, {
      code: 400,
      error: {
        code: error?.code,
        cause: error
      },
      message: error?.message || 'Error verifying CNAME record.'
    });
  }
}
