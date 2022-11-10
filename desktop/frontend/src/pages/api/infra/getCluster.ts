import type { NextApiRequest, NextApiResponse } from 'next';
import * as k8s from '@kubernetes/client-node';
import {
  CRDMeta,
  GetCRD,
  K8sApi,
  GetUserDefaultNameSpace
} from '../../../services/backend/kubernetes';
import { JsonResp } from '../response';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const config = req.body.kubeconfig;
  const cluster_name = req.body.clusterName;
  const kc = K8sApi(config);
  const kube_user = kc.getCurrentUser();
  if (kube_user === null) {
    return res.status(404);
  }
  const cluster_meta: CRDMeta = {
    group: 'cluster.sealos.io',
    version: 'v1',
    namespace: GetUserDefaultNameSpace(kube_user.name),
    // namespace: 'cluster-system',
    plural: 'clusters'
  };

  try {
    const clusterDesc = await GetCRD(kc, cluster_meta, cluster_name);
    JsonResp(clusterDesc.body, res);
  } catch (err) {
    if (err instanceof k8s.HttpError) {
      console.log(err.body.message);
    }
    JsonResp(err, res);
  }
}
