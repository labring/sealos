import type { NextApiRequest, NextApiResponse } from 'next';
import { ApiResp } from '@/services/kubernet';
import { authSession } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
import { jsonRes } from '@/services/backend/response';
import { json2Backup } from '@/utils/json2Yaml';

export type Props = {
  backupName: string;
  dbName: string;
  remark?: string;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResp>) {
  const { backupName, dbName, remark } = req.body as Props;

  if (!dbName || !backupName) {
    jsonRes(res, {
      code: 500,
      error: 'params error'
    });
    return;
  }

  const group = 'dataprotection.kubeblocks.io';
  const version = 'v1alpha1';
  const labelKey = 'app.kubernetes.io/instance';
  const plural = 'backuppolicies';

  try {
    const { k8sCustomObjects, namespace, applyYamlList } = await getK8s({
      kubeconfig: await authSession(req)
    });

    // get backup backupolicies.dataprotection.kubeblocks.io
    const { body } = (await k8sCustomObjects.listNamespacedCustomObject(
      group,
      version,
      namespace,
      plural,
      undefined,
      undefined,
      undefined,
      undefined,
      `${labelKey}=${dbName}`
    )) as { body: any };

    const backupPolicyName = body?.items?.[0]?.metadata?.name;

    if (!backupPolicyName) {
      throw new Error('Cannot find backup policy');
    }

    const backupCr = json2Backup({
      name: backupName,
      dbName,
      backupPolicyName,
      remark
    });

    // create backup
    await applyYamlList([backupCr], 'create');

    jsonRes(res);
  } catch (err: any) {
    jsonRes(res, {
      code: 500,
      error: err
    });
  }
}
