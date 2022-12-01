// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import * as k8s from '@kubernetes/client-node';
import type { NextApiRequest, NextApiResponse } from 'next';
import { clusterCRDTemplate } from '../../../mock/infra';
import { ApplyYaml, GetUserDefaultNameSpace, K8sApi } from '../../../services/backend/kubernetes';
import { CRDTemplateBuilder } from '../../../services/backend/wrapper';
import { JsonResp } from '../response';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { infraName, kubeconfig, clusterName } = req.body;
  const kc = K8sApi(kubeconfig);
  const kube_user = kc.getCurrentUser();
  if (kube_user === null) {
    res.status(400);
    return;
  }
  const image1 = req.body.images.image1;
  const image2 = req.body.images.image2;
  const clusterCRD = CRDTemplateBuilder(clusterCRDTemplate, {
    clusterName,
    infraName,
    image1,
    image2
  });

  try {
    const result = await ApplyYaml(kc, clusterCRD);
    JsonResp(result, res);
  } catch (err) {
    if (err instanceof k8s.HttpError) {
      console.log(err.body.message);
    }
    JsonResp(err, res);
  }
}
