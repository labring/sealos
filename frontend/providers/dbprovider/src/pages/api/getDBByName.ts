import type { NextApiRequest, NextApiResponse } from 'next';
import { ApiResp } from '@/services/kubernet';
import { authSession } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
import { jsonRes } from '@/services/backend/response';
import {
  extractParameterConfigFromConfiguration,
  getDBConfigurationByName
} from '@/services/backend/database-config';
import { KbPgClusterType } from '@/types/cluster';
import { adaptDBDetail } from '@/utils/adapt';
import { defaultDBDetail } from '@/constants/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResp>) {
  try {
    const { namespace } = await getK8s({
      kubeconfig: await authSession(req)
    });

    const { name, mock } = req.query as { name: string; mock?: string };
    if (!name) {
      throw new Error('name is empty');
    }

    if (mock === 'true') {
      return jsonRes(res, {
        data: defaultDBDetail
      });
    }

    const body = await getCluster(req, name);
    const dbDetail = adaptDBDetail(body);

    try {
      const configurationBody = await getDBConfiguration(req, dbDetail.dbName, dbDetail.dbType);
      if (configurationBody) {
        const parameterConfig = extractParameterConfigFromConfiguration(
          configurationBody,
          dbDetail.dbType
        );
        dbDetail.parameterConfig = parameterConfig;
      }
    } catch (error) {
      console.log('Failed to get configuration:', error);
    }

    jsonRes(res, {
      data: dbDetail
    });
  } catch (err: any) {
    jsonRes(res, {
      code: 500,
      error: err
    });
  }
}

export async function getCluster(req: NextApiRequest, name: string) {
  const { k8sCustomObjects, namespace } = await getK8s({
    kubeconfig: await authSession(req)
  });

  const { body } = (await k8sCustomObjects.getNamespacedCustomObject(
    'apps.kubeblocks.io',
    'v1alpha1',
    namespace,
    'clusters',
    name
  )) as {
    body: KbPgClusterType;
  };

  return body;
}

export async function getDBConfiguration(req: NextApiRequest, dbName: string, dbType: string) {
  const { k8sCustomObjects, namespace } = await getK8s({
    kubeconfig: await authSession(req)
  });

  return getDBConfigurationByName({
    k8sCustomObjects,
    namespace,
    dbName,
    dbType
  });
}
