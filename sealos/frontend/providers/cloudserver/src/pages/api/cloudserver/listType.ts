import { verifyAccessToken } from '@/services/backend/auth';
import { jsonRes } from '@/services/backend/response';
import { POST } from '@/services/requestLaf';
import { CVMChargeType } from '@/types/region';
import { NextApiRequest, NextApiResponse } from 'next';

export type ServerTypePayload = {
  zone: string;
  virtualMachinePackageFamily: string;
  chargeType: CVMChargeType;
  virtualMachineType: string;
  virtualMachineArch: string;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    await verifyAccessToken(req);

    const payload = req.body as ServerTypePayload;

    const { data, error } = await POST('/action/get-virtual-machine-package', payload, {
      headers: {
        Authorization: req.headers.authorization
      }
    });

    if (error) {
      return jsonRes(res, { code: 500, error: error });
    }

    jsonRes(res, {
      data: data
    });
  } catch (error) {
    jsonRes(res, { code: 500, error: error });
  }
}
