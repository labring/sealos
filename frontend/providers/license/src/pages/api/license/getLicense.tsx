import type { NextApiRequest, NextApiResponse } from 'next';
import { jsonRes } from '@/services/backend/response';
import { connectToLicenseCollection } from '@/services/db/mongodb';
import { getK8s } from '@/services/backend/kubernetes';
import { authSession } from '@/services/backend/auth';
import { getUserId } from '@/utils/user';

export default async function handler(req: NextApiRequest, res: NextApiResponse<any>) {
  try {
    const { page = '1', pageSize = '10' } = req.query as { page: string; pageSize: string };
    const { namespace } = await getK8s({
      kubeconfig: await authSession(req)
    });
    const userId = getUserId();
    const skip = (parseInt(page) - 1) * parseInt(pageSize);

    const license_collection = await connectToLicenseCollection();
    const totalCountPipeline = [
      { $match: { uid: userId, 'meta.token': { $ne: '' } } },
      { $count: 'totalCount' }
    ];
    const contentPipeline = [
      { $match: { uid: userId, 'meta.token': { $ne: '' } } },
      { $sort: { 'meta.createTime': -1 } },
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
    jsonRes(res, {
      code: 500,
      error: err
    });
  }
}
