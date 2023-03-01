import * as k8s from '@kubernetes/client-node';
import type { NextApiRequest, NextApiResponse } from 'next';
import { GetUserDefaultNameSpace, K8sApi } from 'services/backend/kubernetes';
import { BadAuthResp, JsonResp } from '../response';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { kubeconfig, pgsqlName } = req.body;
  const kc = K8sApi(kubeconfig);
  const kube_user = kc.getCurrentUser();

  if (kube_user === null) {
    return BadAuthResp(res);
  }

  const namespace = GetUserDefaultNameSpace(kube_user.name);

  try {
    const result = await kc
      .makeApiClient(k8s.EventsV1Api)
      .listNamespacedEvent(
        namespace,
        undefined,
        undefined,
        undefined,
        `regarding.name=${pgsqlName}`
      );
    JsonResp(result.body, res);
  } catch (err) {
    if (err instanceof k8s.HttpError) {
      console.log(err.body.message);
    }
    JsonResp(err, res);
  }
}
