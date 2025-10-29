import { jsonRes } from '@/services/backend/response';
import { ApiResp } from '@/services/kubernet';
import { authSession } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
import { SupportReconfigureDBType } from '@/types/db';
import { VLOGS_CONFIG } from '@/config/vlogs';
import type { NextApiRequest, NextApiResponse } from 'next';

interface VlogsPodQueryParams {
  namespace: string;
  app: string;
  podQuery: string;
  startTime?: string;
  endTime?: string;
  time?: string;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResp>) {
  try {
    const { dbName, dbType, startTime, endTime, timeRange = '30d' } = req.body;

    if (!dbName || !dbType) {
      throw new Error('Missing required parameters: dbName, dbType');
    }

    const { namespace, k8sCore } = await getK8s({
      kubeconfig: await authSession(req)
    });

    let podPvcMap: Record<string, string[]> = {};
    let pvcPodMap: Record<string, string> = {};

    const pods = await k8sCore.listNamespacedPod(
      namespace,
      undefined,
      undefined,
      undefined,
      undefined,
      `app.kubernetes.io/instance=${dbName}`
    );

    for (const pod of pods.body.items) {
      const podName = pod.metadata?.name || '';
      const pvcClaimNames =
        pod.spec?.volumes
          ?.filter((vol) => vol.persistentVolumeClaim)
          ?.map((vol) => vol.persistentVolumeClaim!.claimName) || [];

      const pvcUids: string[] = [];

      for (const claimName of pvcClaimNames) {
        try {
          const pvc = await k8sCore.readNamespacedPersistentVolumeClaim(claimName, namespace);
          const pvcUid = pvc.body.metadata?.uid || '';
          if (pvcUid) {
            const prefixedUid = `pvc-${pvcUid}`;
            pvcUids.push(prefixedUid);
            pvcPodMap[prefixedUid] = podName;
          } else {
            console.warn(`PVC ${claimName} has no UID, using name as fallback`);
            pvcUids.push(claimName);
            pvcPodMap[claimName] = podName;
          }
        } catch (error) {
          console.warn(`Failed to get PVC UID for ${claimName}:`, error);
          pvcUids.push(claimName);
          pvcPodMap[claimName] = podName;
        }
      }

      podPvcMap[podName] = pvcUids;
    }

    const vlogsParams: VlogsPodQueryParams = {
      namespace: namespace,
      app: dbName,
      podQuery: 'true'
    };

    if (startTime && endTime) {
      vlogsParams.startTime = new Date(startTime).toISOString();
      vlogsParams.endTime = new Date(endTime).toISOString();
    } else {
      vlogsParams.time = timeRange;
    }

    let historicalPods: string[] = [];
    try {
      console.log('Calling vlogs PodList API:', VLOGS_CONFIG.QUERY_PODS_URL);
      console.log('Request params:', vlogsParams);

      const vlogsResponse = await fetch(VLOGS_CONFIG.QUERY_PODS_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(req.headers.authorization ? { Authorization: req.headers.authorization } : {})
        },
        body: JSON.stringify(vlogsParams)
      });

      console.log('Vlogs PodList response status:', vlogsResponse.status);

      if (vlogsResponse.ok) {
        const vlogsData = await vlogsResponse.json();
        historicalPods = Array.isArray(vlogsData) ? vlogsData : [];
        console.log('Historical pods from vlogs:', historicalPods);
      } else {
        const errorText = await vlogsResponse.text();
        console.warn('Failed to get historical pods from vlogs:', errorText);
      }
    } catch (error) {
      console.warn('Failed to get historical pods from vlogs:', error);
    }

    const currentPods = Object.keys(podPvcMap);
    const allPods = [...new Set([...currentPods, ...historicalPods])];

    const result = {
      pods: allPods.map((podName) => ({
        podName,
        alias: podName,
        pvcUids: podPvcMap[podName] || []
      })),
      pvcMap: pvcPodMap
    };

    console.log('Final result:', result);

    jsonRes(res, { data: result });
  } catch (err) {
    console.error('Error in /api/vlogs/database-pods:', err);
    const errorMessage = err instanceof Error ? err.message : 'Internal server error';
    jsonRes(res, {
      code: 500,
      error: errorMessage
    });
  }
}
