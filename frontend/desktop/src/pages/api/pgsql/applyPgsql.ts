// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import * as k8s from '@kubernetes/client-node';
import { generatePgsqlTemplate } from 'mock/pgsql';
import type { NextApiRequest, NextApiResponse } from 'next';
import { ApplyYaml, GetUserDefaultNameSpace, K8sApi } from 'services/backend/kubernetes';
import { JsonResp, BadAuthResp } from '../response';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { kubeconfig, data } = req.body;
  const kc = K8sApi(kubeconfig);
  const kube_user = kc.getCurrentUser();

  if (kube_user === null) {
    return BadAuthResp(res);
  }

  const namespace = GetUserDefaultNameSpace(kube_user.name);
  const pgsqlCRD = generatePgsqlTemplate({ ...data, namespace });

  try {
    const result = await ApplyYaml(kc, pgsqlCRD);
    JsonResp(result, res);
  } catch (err) {
    if (err instanceof k8s.HttpError) {
      console.log(err.body.message, '---');
    }
    JsonResp(err, res);
  }
}
