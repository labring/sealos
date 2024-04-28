import type { NextApiRequest, NextApiResponse } from 'next';
import { ApiResp } from '@/services/kubernet';
import { authSession } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
import { jsonRes } from '@/services/backend/response';
import { postDeployApp } from '@/api/app';

interface Props {
    yaml: string;
    images: Array<{
      name: string;
      path: string;
    }>;
  }

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResp>) {
    try {
        const reqNamespace = req.query.namespace as string;
        const appName = req.query.appName as string;
        const { yaml, images }: Props = req.body;
        const { k8sApp, namespace, k8sCore } = await getK8s({
        kubeconfig: await authSession(req.headers)
        });
        const yamlList = [yaml];
        const applyRes = await postDeployApp(reqNamespace, yamlList);
        jsonRes(res, {
        data: applyRes
        });
    } catch (err: any) {
        jsonRes(res, {
            code: 500,
            error: err
        });
    }
}