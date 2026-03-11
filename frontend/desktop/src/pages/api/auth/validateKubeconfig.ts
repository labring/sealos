import { jsonRes } from '@/services/backend/response';
import { K8sApi } from '@/services/backend/kubernetes/user';
import * as k8s from '@kubernetes/client-node';
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { kubeconfig } = req.body as { kubeconfig: string };
    if (!kubeconfig) {
      return jsonRes(res, { code: 400, message: 'kubeconfig is required' });
    }

    const kc = K8sApi(kubeconfig);
    const ctx = kc.getCurrentContext();
    const ctxObj = kc.getContextObject(ctx);
    const namespace = ctxObj?.namespace;

    if (!namespace) {
      return jsonRes(res, { code: 400, message: 'invalid kubeconfig: no namespace' });
    }

    const coreApi = kc.makeApiClient(k8s.CoreV1Api);
    await coreApi.readNamespace(namespace);

    return jsonRes(res, { code: 200, message: 'valid' });
  } catch (err: any) {
    const statusCode = err?.statusCode || err?.response?.statusCode;
    if (statusCode === 401 || statusCode === 403) {
      return jsonRes(res, { code: 401, message: 'kubeconfig is invalid or expired' });
    }
    return jsonRes(res, { code: 500, message: 'failed to validate kubeconfig' });
  }
}
