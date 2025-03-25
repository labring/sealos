import type { NextApiRequest, NextApiResponse } from 'next';
import { ApiResp } from '@/services/kubernet';
import { authSession } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
import { jsonRes } from '@/services/backend/response';
import { json2SwitchMsNode } from '@/utils/json2Yaml';
import { DBType } from '@/types/db';

export type SwitchMsData = {
  dbName: string;
  componentName: DBType;
  podName: string;
  namespace: string;
  uid: string;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResp>) {
  try {
    const data = req.body as SwitchMsData;
    const { applyYamlList, namespace, k8sCore } = await getK8s({
      kubeconfig: await authSession(req)
    });
    const yaml = json2SwitchMsNode(data);
    await applyYamlList([yaml], 'update');
    jsonRes(res, { data: 'success switch roles' });
  } catch (err: any) {
    jsonRes(res, {
      code: 500,
      error: err
    });
  }
}
