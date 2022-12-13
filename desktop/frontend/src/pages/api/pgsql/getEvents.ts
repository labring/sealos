import type { NextApiRequest, NextApiResponse } from 'next';
import * as k8s from '@kubernetes/client-node';
import { CRDMeta, GetCRD, K8sApi, GetUserDefaultNameSpace } from 'services/backend/kubernetes';
import { JsonResp } from '../response';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { kubeconfig, pgsqlName } = req.body;
  const kc = K8sApi(kubeconfig);
  const kube_user = kc.getCurrentUser();

  if (kube_user === null) {
    return res.status(400);
  }

  try {
    const meta: CRDMeta = {
      group: 'acid.zalan.do',
      version: 'v1',
      namespace: GetUserDefaultNameSpace(kube_user.name),
      plural: 'postgresqls'
    };
    const result = await kc
      .makeApiClient(k8s.EventsV1Api)
      .listNamespacedEvent(
        meta.namespace,
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
