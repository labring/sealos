import { enabelGpu, enableInvoice, enableRecharge, enableTransfer } from '@/service/enabled';
import { jsonRes } from '@/service/backend/response';
import { NextApiRequest, NextApiResponse } from 'next';
import { EnvData } from '@/types/env';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    return jsonRes<EnvData>(res, {
      data: {
        rechargeEnabled: enableRecharge(),
        transferEnabled: enableTransfer(),
        invoiceEnabled: enableInvoice(),
        gpuEnabled: enabelGpu()
      },
      code: 200
    });
  } catch (error) {
    console.log(error);
    jsonRes(res, {
      message: 'Failed to send code',
      code: 500
    });
  }
}
