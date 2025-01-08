import { crLabelKey, DBReconfigStatusMap } from '@/constants/db';
import { authSession } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
import { jsonRes } from '@/services/backend/response';
import { ApiResp } from '@/services/kubernet';
import { KubeBlockOpsRequestType } from '@/types/cluster';
import { DBType, OpsRequestItemType } from '@/types/db';
import { cpuFormatToC, memoryFormatToGi } from '@/utils/tools';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResp>) {
  try {
    const { name } = req.query as {
      name: string;
    };

    const { k8sCustomObjects, namespace } = await getK8s({
      kubeconfig: await authSession(req)
    });

    let labelSelector = `app.kubernetes.io/instance=${name},${crLabelKey}=${name}`;

    const opsrequestsList = (await k8sCustomObjects.listNamespacedCustomObject(
      'apps.kubeblocks.io',
      'v1alpha1',
      namespace,
      'opsrequests',
      undefined,
      undefined,
      undefined,
      undefined,
      labelSelector
    )) as {
      body: {
        items: KubeBlockOpsRequestType[];
      };
    };

    const opsrequests = opsrequestsList.body.items
      .map((item) => {
        const simpleTypes = ['Start', 'Stop', 'Restart'];

        const configurations = (() => {
          if (simpleTypes.includes(item.spec.type)) {
            return [{ parameterName: item.spec.type, newValue: '-', oldValue: '-' }];
          }

          if (item.spec.type === 'VerticalScaling') {
            const componentName = item.spec?.verticalScaling?.[0]?.componentName!;
            const oldConfig = item.status?.lastConfiguration?.components?.[componentName];
            const newConfig = item.spec?.verticalScaling?.[0];

            const changedConfigs = [];

            if (oldConfig?.limits?.cpu !== newConfig?.limits?.cpu) {
              changedConfigs.push({
                parameterName: item.spec.type + 'CPU',
                newValue: cpuFormatToC(newConfig?.limits?.cpu) || '-',
                oldValue: cpuFormatToC(oldConfig?.limits?.cpu) || '-'
              });
            }

            if (oldConfig?.limits?.memory !== newConfig?.limits?.memory) {
              changedConfigs.push({
                parameterName: item.spec.type + 'Memory',
                newValue: memoryFormatToGi(newConfig?.limits?.memory) || '-',
                oldValue: memoryFormatToGi(oldConfig?.limits?.memory) || '-'
              });
            }

            return changedConfigs;
          }

          if (item.spec.type === 'HorizontalScaling') {
            const componentName = item.spec?.horizontalScaling?.[0]?.componentName!;
            const oldReplicas =
              item.status?.lastConfiguration?.components?.[componentName]?.replicas;
            const newReplicas = item.spec?.horizontalScaling?.[0]?.replicas;

            return [
              {
                parameterName: 'HorizontalScaling',
                newValue: String(newReplicas || '-'),
                oldValue: String(oldReplicas || '-')
              }
            ];
          }

          if (item.spec.type === 'VolumeExpansion') {
            const componentName = item.spec?.volumeExpansion?.[0]?.componentName!;
            const oldStorage =
              item.status?.lastConfiguration?.components?.[componentName]?.volumeClaimTemplates?.[0]
                ?.storage;
            const newStorage = item.spec?.volumeExpansion?.[0]?.volumeClaimTemplates?.[0]?.storage;

            return [
              {
                parameterName: 'VolumeExpansion',
                newValue: String(newStorage || '-'),
                oldValue: String(oldStorage || '-')
              }
            ];
          }

          return [
            {
              parameterName: item.spec.type,
              newValue: '-',
              oldValue: '-'
            }
          ];
        })();

        return {
          id: item.metadata.uid,
          name: item.metadata.name,
          status:
            item.status?.phase && DBReconfigStatusMap[item.status.phase]
              ? DBReconfigStatusMap[item.status.phase]
              : DBReconfigStatusMap.Creating,
          startTime: new Date(item.metadata.creationTimestamp),
          namespace: item.metadata.namespace,
          configurations
        };
      })
      .filter((item) => item.configurations.length > 0) as OpsRequestItemType[];

    jsonRes(res, {
      data: opsrequests
    });
  } catch (err: any) {
    jsonRes(res, {
      code: 500,
      error: err
    });
  }
}
