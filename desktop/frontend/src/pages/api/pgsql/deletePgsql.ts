import * as k8s from '@kubernetes/client-node';
import type { NextApiRequest, NextApiResponse } from 'next';
import { CRDMeta, DeleteCRD, GetUserDefaultNameSpace, K8sApi } from 'services/backend/kubernetes';
import { JsonResp } from '../response';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { pgsqlName, kubeconfig } = req.body;
  const kc = K8sApi(kubeconfig);
  const kube_user = kc.getCurrentUser();

  if (kube_user === null) {
    res.status(400);
    return;
  }

  const meta: CRDMeta = {
    group: 'acid.zalan.do',
    version: 'v1',
    namespace: GetUserDefaultNameSpace(kube_user.name),
    plural: 'postgresqls'
  };

  try {
    const result = await DeleteCRD(kc, meta, pgsqlName);
    JsonResp(result, res);
  } catch (err) {
    if (err instanceof k8s.HttpError) {
      console.log(err.body.message);
    }
    JsonResp(err, res);
  }
}
