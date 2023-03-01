import type { NextApiRequest, NextApiResponse } from 'next';
import * as k8s from '@kubernetes/client-node';
import { CRDMeta, GetCRD, K8sApi, GetUserDefaultNameSpace } from 'services/backend/kubernetes';
import { BadAuthResp, JsonResp } from '../response';
import { pgsqlMeta } from 'mock/pgsql';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { kubeconfig, pgsqlName } = req.body;
  const kc = K8sApi(kubeconfig);
  const kube_user = kc.getCurrentUser();

  if (kube_user === null) {
    return BadAuthResp(res);
  }

  const meta: CRDMeta = {
    ...pgsqlMeta,
    namespace: GetUserDefaultNameSpace(kube_user.name)
  };

  try {
    const infraDesc = await GetCRD(kc, meta, pgsqlName);
    JsonResp(infraDesc.body, res);
  } catch (err) {
    if (err instanceof k8s.HttpError) {
      console.log(err.body.message);
    }
    JsonResp(err, res);
  }
}
