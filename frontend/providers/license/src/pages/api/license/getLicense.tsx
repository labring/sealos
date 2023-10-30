import type { NextApiRequest, NextApiResponse } from 'next';
import { jsonRes } from '@/services/backend/response';
import { connectToLicenseCollection } from '@/services/db/mongodb';
import { getK8s } from '@/services/backend/kubernetes';
import { authSession } from '@/services/backend/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse<any>) {
  try {
    const { page = '1', pageSize = '10' } = req.query as { page: string; pageSize: string };
    const { kube_user } = await getK8s({
      kubeconfig: await authSession(req)
    });
    console.log(kube_user?.name, 'user get license record');

    const skip = (parseInt(page) - 1) * parseInt(pageSize);

    const license_collection = await connectToLicenseCollection();
    const totalCountPipeline = [{ $match: { token: { $ne: '' } } }, { $count: 'totalCount' }];
    const contentPipeline = [
      { $match: { token: { $ne: '' } } },
      { $sort: { activationTime: -1 } },
      { $skip: skip },
      { $limit: parseInt(pageSize) }
    ];

    const [totalCountResult, contentResult] = await Promise.all([
      license_collection.aggregate(totalCountPipeline).toArray(),
      license_collection.aggregate(contentPipeline).toArray()
    ]);

    jsonRes(res, {
      data: {
        items: contentResult,
        totalCount: totalCountResult.length > 0 ? totalCountResult[0].totalCount : 0
      }
    });
  } catch (err) {
    console.log(err, 'getlicense----');
    jsonRes(res, {
      code: 500,
      error: err
    });
  }
}
