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

    await testCname(customDomain, publicDomain)
      .then((data) => {
        if (!data) {
          // No data = CNAME not found error
          throw {
            code: 'NO_CNAME_FOUND',
            message: `No CNAME record found for domain: ${customDomain}`,
            hostname: customDomain
          };
        }
      })
      .catch((e) => {
        console.log('Invalid resolve result for CNAME record on ' + customDomain + ': ', e);
        throw e;
      });

    jsonRes(res);
  } catch (error: any) {
    console.log('CNAME mismatch error:', error);
    jsonRes(res, {
      code: 400,
      error: {
        code: error.code
      },
      message: error?.message || 'CNAME mismatch error'
    });
  }
}
