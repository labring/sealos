import type { NextApiRequest, NextApiResponse } from 'next';
import { BadRequestResp, NotFoundResp, JsonResp } from '../response';
import { CheckIsInCluster, K8sApi, ListPods } from '../../../lib/kubernetes';

export default async function handler(req: NextApiRequest, resp: NextApiResponse) {
  if (req.method !== 'GET') {
    return BadRequestResp(resp);
  }

  const { kubeconfig } = req.body;
  if (kubeconfig === '') {
    return NotFoundResp(resp);
  }

  console.log(kubeconfig);

  const kubeconfigR = kubeconfig;
  if (CheckIsInCluster()) {
    const kubeconfigR = kubeconfig.replace(
      'https://apiserver.cluster.local:6443',
      'https://kubernetes.default.svc.cluster.local:443'
    );
  }

  const kc = K8sApi(kubeconfigR);
  const res = await ListPods(kc, 'sealos');
  JsonResp(res.body, resp);
}
