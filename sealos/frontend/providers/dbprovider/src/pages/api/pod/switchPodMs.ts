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
    const { applyYamlList } = await getK8s({
      kubeconfig: await authSession(req)
    });
    const yaml = json2SwitchMsNode(data);
    const result = await applyYamlList([yaml], 'create');
    console.log(result);
    jsonRes(res, {
      data: {
        metadata: result[0].metadata,
        message: 'The switch request was sent successfully.'
      }
    });
  } catch (err: any) {
    jsonRes(res, {
      code: 500,
      error: err
    });
  }
}
