import { NextApiRequest, NextApiResponse } from 'next';
import { jsonRes } from '@/services/backend/response';
import { globalPrisma } from '@/services/backend/db/init';
import { isString } from 'lodash';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const domain = req.query.domain;
    if (!isString(domain))
      return jsonRes(res, {
        code: 400,
        message: 'The query is invalid',
        data: {
          containDomain: false
        }
      });

    const domainEntry = await globalPrisma.region.findFirst({
      where: {
        domain: decodeURIComponent(domain)
      }
    });
    if (!domainEntry)
      return jsonRes(res, {
        code: 404,
        message: 'The domain is not found',
        data: {
          containDomain: false
        }
      });
    return jsonRes(res, {
      code: 200,
      message: 'Successfully',
      data: {
        containDomain: !!domainEntry
      }
    });
  } catch (err) {
    console.log(err);
    return jsonRes(res, {
      message: 'Failed to verify the domain',
      code: 500
    });
  }
}
