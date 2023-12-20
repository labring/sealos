import type { NextApiRequest, NextApiResponse } from 'next';
import { jsonRes } from '@/services/backend/response';
import dns from 'dns';
import type { AuthCnamePrams } from '@/api/params';
import { getErrText } from '@/utils/tools';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { publicDomain, customDomain } = req.body as AuthCnamePrams;

    await (async () =>
      new Promise((resolve, reject) => {
        dns.resolveCname(customDomain, (err, address) => {
          console.log(err, address);
          if (err) return reject(err);

          if (address[0] !== publicDomain)
            return reject("Cname auth error: customDomain's cname is not equal to publicDomain");
          resolve('');
        });
      }))();

    jsonRes(res);
  } catch (error) {
    jsonRes(res, {
      code: 500,
      error
    });
  }
}
