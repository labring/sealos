import { authSession } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
import { jsonRes } from '@/services/backend/response';
import { ApiResp } from '@/services/kubernet';
import { KubeBlockOpsRequestType } from '@/types/cluster';
import { DBType, OpsRequestItemType } from '@/types/db';
import { adaptOpsRequest } from '@/utils/adapt';
import {
  DBNameLabel,
  DBReconfigureKey,
  DBParameterHistoryDataKey,
  DBParameterHistoryLabel,
  ReconfigStatus
} from '@/constants/db';
import {
  adaptParameterHistory,
  completeParameterHistory,
  readParameterHistory,
  resolveParameterHistoryStatus
} from '@/utils/parameterHistory';
import { getCurrentParameterValues } from '@/utils/parameterConfig';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResp>) {
  try {
    const { name, label, dbType } = req.query as {
      name: string;
      label: string;
      dbType: DBType;
    };

    const { k8sCore, k8sCustomObjects, namespace } = await getK8s({
      kubeconfig: await authSession(req)
    });

    let labelSelector = `app.kubernetes.io/instance=${name}`;
    if (label) {
      labelSelector += `,${label}`;
    }

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

    let data: OpsRequestItemType[] = [];
    if (opsrequestsList.body.items.at(0)?.spec.reconfigure) {
      data = opsrequestsList.body.items.map((res) => adaptOpsRequest(res, 'Reconfiguring'));
    } else {
      data = opsrequestsList.body.items.map((res) => adaptOpsRequest(res, 'Switchover'));
    }

    let parameterHistory: OpsRequestItemType[] = [];
    if (label === DBReconfigureKey) {
      const { body: historyList } = await k8sCore.listNamespacedConfigMap(
        namespace,
        undefined,
        undefined,
        undefined,
        undefined,
        `${DBNameLabel}=${name},${DBParameterHistoryLabel}=true`
      );

      const runningHistory = historyList.items.filter(
        (configMap) => readParameterHistory(configMap)?.status === ReconfigStatus.Running
      );
      if (runningHistory.length > 0) {
        try {
          const currentValues = await getCurrentParameterValues({
            dbName: name,
            dbType,
            namespace,
            k8sCore,
            k8sCustomObjects,
            includeConfigurationOverrides: false
          });

          await Promise.all(
            runningHistory.map(async (configMap) => {
              const history = readParameterHistory(configMap);
              if (!history) return;
              const status = resolveParameterHistoryStatus({ history, currentValues });
              if (status !== ReconfigStatus.Succeed && status !== ReconfigStatus.Failed) return;

              await completeParameterHistory({
                k8sCore,
                configMap,
                status,
                ...(status === ReconfigStatus.Failed
                  ? { error: 'Timed out waiting for database parameters to take effect' }
                  : {})
              });
              history.status = status;
              history.completedAt = new Date().toISOString();
              configMap.data ||= {};
              configMap.data[DBParameterHistoryDataKey] = JSON.stringify(history);
            })
          );
        } catch (error) {
          console.warn('Failed to read current parameter values:', error);
          await Promise.all(
            runningHistory.map(async (configMap) => {
              const history = readParameterHistory(configMap);
              if (!history) return;
              const status = resolveParameterHistoryStatus({ history });
              if (status !== ReconfigStatus.Failed) return;

              await completeParameterHistory({
                k8sCore,
                configMap,
                status,
                error: 'Timed out waiting for database parameters to take effect'
              });
              history.status = status;
              history.completedAt = new Date().toISOString();
              configMap.data ||= {};
              configMap.data[DBParameterHistoryDataKey] = JSON.stringify(history);
            })
          );
        }
      }

      const historyItems = historyList.items
        .map((configMap) => ({ configMap, history: readParameterHistory(configMap) }))
        .filter(({ configMap, history }) => Boolean(history && configMap.metadata?.name))
        .map(({ configMap, history }) => ({
          item: adaptParameterHistory(configMap),
          opsRequestName: history?.opsRequestName
        }));
      const proxiedOpsRequestNames = new Set(
        historyItems.map(({ opsRequestName }) => opsRequestName).filter(Boolean)
      );
      const parameterHistorySignatureCounts = new Map<string, number>();
      historyItems
        .filter(({ opsRequestName }) => !opsRequestName)
        .forEach(({ item }) => {
          const signature = item?.configurations
            ?.map(
              ({ parameterName, oldValue, newValue }) =>
                `${parameterName}\u0000${oldValue}\u0000${newValue}`
            )
            .sort()
            .join('\u0001');
          if (signature) {
            parameterHistorySignatureCounts.set(
              signature,
              (parameterHistorySignatureCounts.get(signature) || 0) + 1
            );
          }
        });
      data = data.filter((item) => {
        if (proxiedOpsRequestNames.has(item.name)) return false;
        const signature = item.configurations
          ?.map(
            ({ parameterName, oldValue, newValue }) =>
              `${parameterName}\u0000${oldValue}\u0000${newValue}`
          )
          .sort()
          .join('\u0001');
        const matchingHistoryCount = signature
          ? parameterHistorySignatureCounts.get(signature) || 0
          : 0;
        if (signature && matchingHistoryCount > 0) {
          parameterHistorySignatureCounts.set(signature, matchingHistoryCount - 1);
          return false;
        }
        return true;
      });
      parameterHistory = historyItems
        .map(({ item }) => item)
        .filter((item): item is OpsRequestItemType => Boolean(item));
    }

    jsonRes(res, {
      data: [...data, ...parameterHistory].sort(
        (left, right) => new Date(right.startTime).getTime() - new Date(left.startTime).getTime()
      )
    });
  } catch (err: any) {
    jsonRes(res, {
      code: 500,
      error: err
    });
  }
}
