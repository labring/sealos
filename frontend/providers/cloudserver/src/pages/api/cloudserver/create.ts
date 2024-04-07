import { verifyAccessToken } from '@/services/backend/auth';
import { jsonRes } from '@/services/backend/response';
import getCloudProvider from '@/services/cloudProvider';
import { POST } from '@/services/requestLaf';
import { CloudServerVendors, EditForm } from '@/types/cloudserver';
import { customAlphabet } from 'nanoid';
import { NextApiRequest, NextApiResponse } from 'next';

type CloudServerPayload = {
  instanceType: string;
  imageId: string;
  systemDisk: number;
  dataDisks: number[];
  internetMaxBandwidthOut?: number;
  loginPassword: string;
  cloudProvider: CloudServerVendors;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    await verifyAccessToken(req);
    const form = req.body as EditForm;
    const cloudProvider = getCloudProvider();
    const dataDisks = form.storages
      .filter(({ use }) => use === 'DataDisk')
      .flatMap(({ size, amount }) => Array(amount).fill(size));
    console.log(dataDisks);

    const payload: CloudServerPayload = {
      instanceType: form.instanceType,
      imageId: form.systemImageId,
      systemDisk: form.systemDiskSize,
      dataDisks: dataDisks,
      ...(form.publicIpAssigned
        ? {
            internetMaxBandwidthOut: form.internetMaxBandWidthOut
          }
        : {}),
      cloudProvider: cloudProvider,
      loginPassword: form.password
    };

    console.log(payload, 'paylaod');

    const { data } = await POST('/action/create', payload, {
      headers: {
        Authorization: req.headers.authorization
      }
    });

    return jsonRes(res, {
      data: data
    });
  } catch (error) {
    console.log(error);
    jsonRes(res, { code: 500, error: error });
  }
}
