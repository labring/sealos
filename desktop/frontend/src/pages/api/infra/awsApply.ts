// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import * as k8s from '@kubernetes/client-node';
import type { NextApiRequest, NextApiResponse } from 'next';
import { infraCRDTemplate } from '../../../mock/infra';
import { ApplyYaml, K8sApi } from '../../../services/backend/kubernetes';
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
    kubeconfig,
    nodeDiskType,
    masterDiskType
  } = req.body;
  const kc = K8sApi(kubeconfig);
  const kube_user = kc.getCurrentUser();
  if (kube_user === null) {
    res.status(400);
    return;
  }
  const infraCRD = CRDTemplateBuilder(infraCRDTemplate, {
    infraName,
    masterCount,
    masterType,
    nodeCount,
    nodeType,
    masterDisk,
    nodeDisk,
    nodeDiskType,
    masterDiskType
  });

  try {
    const result = await ApplyYaml(kc, infraCRD);
    JsonResp(result, res);
  } catch (err) {
    if (err instanceof k8s.HttpError) {
      console.log(err.body.message, '---');
    }
    JsonResp(err, res);
  }
}
