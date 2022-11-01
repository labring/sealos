// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import * as k8s from '@kubernetes/client-node';
import type { NextApiRequest, NextApiResponse } from 'next';
import { clusterCRDTemplate, infraCRDTemplate } from '../../../mock/infra';
import { ApplyYaml, GetUserDefaultNameSpace, K8sApi } from '../../../services/backend/kubernetes';
import { CRDTemplateBuilder } from '../../../services/backend/wrapper';
import { JsonResp } from '../response';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const {
    infraName,
    masterType,
    nodeType,
    masterCount,
    nodeCount,
    masterDisk,
    nodeDisk,
    kubeconfig
  } = req.body;
  const kc = K8sApi(kubeconfig);
  const kube_user = kc.getCurrentUser();
  if (kube_user === null) {
    res.status(400);
    return;
  }
  const namespace = GetUserDefaultNameSpace(kube_user.name);
  // const namespace = 'default';
  const infraCRD = CRDTemplateBuilder(infraCRDTemplate, {
    infraName,
    namespace,
    masterCount,
    masterType,
    nodeCount,
    nodeType,
    masterDisk,
    nodeDisk
  });
  try {
    const result = await ApplyYaml(kc, infraCRD);
    JsonResp(result, res);
  } catch (err) {
    if (err instanceof k8s.HttpError) {
      console.log(err.body.message);
    }
    JsonResp(err, res);
  }
  const clusterName = req.body.clusterName;
  const image1 = req.body.images.image1;
  const image2 = req.body.images.image2;
  const clusterCRD = CRDTemplateBuilder(clusterCRDTemplate, {
    clusterName,
    namespace,
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
