import * as k8s from '@kubernetes/client-node';
import * as yaml from 'js-yaml';
import type { NextApiRequest, NextApiResponse } from 'next';
import { infraCRDTemplate } from '../../../mock/infra';
import {
  CRDMeta,
  GetUserDefaultNameSpace,
  K8sApi,
  UpdateCRD
} from '../../../services/backend/kubernetes';
import { CRDTemplateBuilder } from '../../../services/backend/wrapper';
import { JsonResp } from '../response';
import { compare } from 'fast-json-patch';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const {
    infraName,
    masterType,
    nodeType,
    masterCount,
    nodeCount,
    masterDisk,
    nodeDisk,
    nodeDiskType,
    masterDiskType,
    kubeconfig,
    oldInfraForm
  } = req.body;
  const kc = K8sApi(kubeconfig);
  const kube_user = kc.getCurrentUser();
  if (kube_user === null) {
    res.status(400);
    return;
  }

  const namespace = GetUserDefaultNameSpace(kube_user.name);
  const infraCRD = CRDTemplateBuilder(infraCRDTemplate, {
    infraName,
    namespace,
    masterCount,
    masterType,
    nodeCount,
    nodeType,
    masterDisk,
    nodeDisk,
    nodeDiskType,
    masterDiskType
  });
  const oldInfraCRD = CRDTemplateBuilder(infraCRDTemplate, oldInfraForm);
  // console.log(infraCRD, oldInfraCRD);

  let spec = await yaml.load(infraCRD);
  let oldSpec = await yaml.load(oldInfraCRD);
  const patch = compare(oldSpec as object, spec as object);
  // JsonResp(patch, res);
  const meta: CRDMeta = {
    group: 'infra.sealos.io',
    version: 'v1',
    namespace: GetUserDefaultNameSpace(kube_user.name),
    plural: 'infras'
  };

  try {
    const result = await UpdateCRD(kc, meta, infraName, patch);
    JsonResp(result, res);
  } catch (err) {
    JsonResp(err, res);
  }
}
