import type { NextApiRequest, NextApiResponse } from 'next';
import * as k8s from '@kubernetes/client-node';
import {
  GetSecret,
  GetService,
  GetUserDefaultNameSpace,
  K8sApi
} from 'services/backend/kubernetes';
import { JsonResp } from '../response';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { kubeconfig, pgsqlName } = req.body;
  const kc = K8sApi(kubeconfig);
  const kube_user = kc.getCurrentUser();

  if (kube_user === null) {
    return res.status(400);
  }

  const namespace = GetUserDefaultNameSpace(kube_user.name);
  try {
    const serviceResult = await GetService(kc, pgsqlName, namespace);
    const secretResult = await GetSecret(
      kc,
      `postgres.${pgsqlName}.credentials.postgresql.acid.zalan.do`,
      namespace
    );
    JsonResp({ serviceResult, secretResult }, res);
  } catch (err) {
    if (err instanceof k8s.HttpError) {
      console.log(err.body.message);
    }
    JsonResp(err, res);
  }
}
