import { verifyAccessToken } from '@/services/backend/auth';
import { getUserKubeconfigNotPatch } from '@/services/backend/kubernetes/admin';
import { K8sApi } from '@/services/backend/kubernetes/user';
import { jsonRes } from '@/services/backend/response';
import { normalizeWorkspaceQuota } from '@/services/backend/workspaceQuota';
import { switchKubeconfigNamespace } from '@/utils/switchKubeconfigNamespace';
import * as k8s from '@kubernetes/client-node';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return jsonRes(res, { code: 405, message: 'Method not allowed' });
  }

  try {
    const payload = await verifyAccessToken(req.headers);
    if (!payload?.workspaceId) {
      return jsonRes(res, { code: 401, message: 'Invalid regional token' });
    }
    const config = await getUserKubeconfigNotPatch(payload.userCrName);
    if (!config) return jsonRes(res, { code: 404, message: 'User kubeconfig not found' });

    // Never accept a namespace from the request; Kubernetes also enforces the user's RBAC.
    const namespace = payload.workspaceId;
    const kc = K8sApi(switchKubeconfigNamespace(config, namespace));
    const { body } = await kc
      .makeApiClient(k8s.CoreV1Api)
      .readNamespacedResourceQuota(`quota-${namespace}`, namespace);
    return jsonRes(res, { data: { quota: normalizeWorkspaceQuota(body) } });
  } catch (error) {
    const statusCode = (error as { statusCode?: number })?.statusCode;
    const code = statusCode === 403 || statusCode === 404 ? statusCode : 500;
    return jsonRes(res, { code, message: 'Failed to read workspace quota' });
  }
}
