import { DBReconfigureMap } from '@/constants/db';
import { authSession } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
import { jsonRes } from '@/services/backend/response';
import { ApiResp } from '@/services/kubernet';
import { DBType } from '@/types/db';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResp>) {
  try {
    const { name, dbType } = req.query as { name: string; dbType: DBType };
    if (!name) {
      throw new Error('name is empty');
    }

    const { namespace, k8sCore } = await getK8s({
      kubeconfig: await authSession(req)
    });

    const dbConfig = DBReconfigureMap[dbType];
    const key = name + dbConfig.configMapName;
    if (!key || !dbConfig.configMapName) {
      return jsonRes(res, {
        data: null
      });
    }

    const { body } = await k8sCore.readNamespacedConfigMap(key, namespace);

    const configData = body?.data && body?.data[dbConfig.configMapKey];
    if (!configData) {
      return jsonRes(res, {
        data: null
      });
    }

    jsonRes(res, {
      data: configData
    });
  } catch (err: any) {
    jsonRes(res, {
      code: 500,
      error: err
    });
  }
}
