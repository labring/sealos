import type { NextApiRequest, NextApiResponse } from 'next';
import { ApiResp } from '@/services/kubernet';
import { authSession } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
import { jsonRes } from '@/services/backend/response';
import { K8sApi } from '@/services/backend/kubernetes';
import * as k8s from '@kubernetes/client-node';

export interface AddonItem {
  name: string;
  type: string;
  status: string;
  age: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResp<AddonItem[]>>
) {
  const { k8sCustomObjects } = await getK8s({
    kubeconfig: await authSession(req)
  });
  try {
    const addonList = await GetAddonList({ req });

    jsonRes(res, {
      data: addonList
    });
  } catch (err: any) {
    jsonRes(res, {
      code: 500,
      error: err
    });
  }
}

export async function GetAddonList({ req }: { req: NextApiRequest }) {
  let kc: k8s.KubeConfig;
  let k8sCustomObjects: k8s.CustomObjectsApi;

  kc = new k8s.KubeConfig();
  kc.loadFromDefault();

  k8sCustomObjects = kc.makeApiClient(k8s.CustomObjectsApi);
  const addonList: AddonItem[] = [];

  try {
    const { body: addonResources } = await k8sCustomObjects.listClusterCustomObject(
      'extensions.kubeblocks.io',
      'v1alpha1',
      'addons'
    );

    if ((addonResources as any).items) {
      for (const addon of (addonResources as any).items) {
        const name = addon.metadata?.name || 'unknown';
        const status = addon.status?.phase || 'Unknown';
        const creationTime = addon.metadata?.creationTimestamp;
        const age = creationTime ? calculateAge(creationTime) : 'unknown';

        addonList.push({
          name,
          type: 'Helm',
          status: status === 'Enabled' ? 'Enabled' : 'Disabled',
          age
        });
      }
    } else {
    }
  } catch (error) {
    try {
      const k8s = await getK8s({ kubeconfig: await authSession(req) });
      const { body: configMaps } = await k8s.k8sCore.listNamespacedConfigMap(
        'kube-system',
        undefined,
        undefined,
        undefined,
        undefined,
        'owner=helm'
      );

      if (configMaps.items) {
        for (const cm of configMaps.items) {
          const labels = cm.metadata?.labels || {};
          const annotations = cm.metadata?.annotations || {};

          const name = labels['app.kubernetes.io/name'] || cm.metadata?.name || 'unknown';
          const status = annotations['status'] || 'Unknown';
          const creationTime = cm.metadata?.creationTimestamp;
          const age = creationTime ? calculateAge(creationTime.toString()) : 'unknown';

          addonList.push({
            name,
            type: 'Helm',
            status: status === 'deployed' ? 'Enabled' : 'Disabled',
            age
          });
        }
      }
    } catch (helmError) {}
  }

  return addonList;
}

function calculateAge(creationTimestamp: string): string {
  const now = new Date();
  const created = new Date(creationTimestamp);
  const diffMs = now.getTime() - created.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    if (diffHours === 0) {
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      return `${diffMinutes}m`;
    }
    return `${diffHours}h`;
  }

  return `${diffDays}d`;
}
