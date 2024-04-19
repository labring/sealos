import { verifyAccessToken } from '@/services/backend/auth';
import { jsonRes } from '@/services/backend/response';
import { POST } from '@/services/requestLaf';
import { CreateCloudServerPayload, EditForm } from '@/types/cloudserver';
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    await verifyAccessToken(req);
    const form = req.body as EditForm;

    const dataDisks = form.storages
      .filter(({ use }) => use === 'DataDisk')
      .flatMap(({ size, amount }) => Array(amount).fill(size));

    const payload: CreateCloudServerPayload = {
      virtualMachinePackageFamily: form.virtualMachinePackageFamily,
      virtualMachinePackageName: form.virtualMachinePackageName,
      imageId: form.systemImageId,
      systemDisk: form.systemDiskSize,
      dataDisks: dataDisks,
      ...(form.publicIpAssigned
        ? {
            internetMaxBandwidthOut: form.internetMaxBandWidthOut
          }
        : { internetMaxBandwidthOut: 0 }),
      loginPassword: form.password,
      loginName: '',
      metaData: {}
    };

    const result = await POST('/action/get-price', payload, {
      headers: {
        Authorization: req.headers.authorization
      }
    });

    return jsonRes(res, {
      data: result?.data
    });
  } catch (error) {
    jsonRes(res, { code: 500, error: error });
  }
}
