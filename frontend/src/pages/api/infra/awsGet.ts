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
  const { kubeconfig, infraName } = req.body;
  const kc = K8sApi(kubeconfig);
  const kube_user = kc.getCurrentUser();
  if (kube_user === null) {
    return res.status(400);
  }
  const infra_meta: CRDMeta = {
    group: 'infra.sealos.io',
    version: 'v1',
    namespace: GetUserDefaultNameSpace(kube_user.name),
    plural: 'infras'
  };

  try {
    const infraDesc = await GetCRD(kc, infra_meta, infraName);
    JsonResp(infraDesc.body, res);
  } catch (err) {
    JsonResp(err, res);
  }
}
