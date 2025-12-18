import type { NextApiRequest, NextApiResponse } from 'next';
import { jsonRes } from '@/services/backend/response';
import { checkDomainICP } from '@/services/backend/acsCdnActions';

export type CheckICPRegParams = {
  domain: string;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (!global.AppConfig.launchpad.checkIcpReg.enabled) {
      throw new Error('Domain ICP registration checker is disabled.');
    }

    const { domain } = req.body as CheckICPRegParams;
    if (!domain || typeof domain !== 'string') {
      return jsonRes(res, {
        code: 400,
        error: 'Missing required parameters: domain'
      });
    }

    const result = await checkDomainICP(domain);

    if (result.success) {
      return jsonRes(res, {
        data: result.data
      });
    } else {
      throw new Error('Cannot check domain ICP registration info.', { cause: result.cause });
    }
  } catch (error: any) {
    jsonRes(res, {
      code: 400,
      error,
      message: error?.message || 'Cannot check domain ICP registration info.'
    });
  }
}
