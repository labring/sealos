import { NextApiRequest, NextApiResponse } from 'next';
import { jsonRes } from '@/services/backend/response';
import { createK8sContext, getAppByName, processAppResponse } from '@/services/backend';
import { mountPathToConfigMapKey } from '@/utils/tools';
import { PatchUtils, V1Deployment, V1StatefulSet } from '@kubernetes/client-node';
import { UpdateConfigMapSchema } from '@/types/request_schema';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== 'PUT') {
      return jsonRes(res, {
        code: 405,
        error: `Method ${req.method} Not Allowed`
      });
    }

    const { name: appName } = req.query as { name: string };

    const parseResult = UpdateConfigMapSchema.safeParse(req.body);
    if (!parseResult.success) {
      return jsonRes(res, {
        code: 400,
        error: parseResult.error
      });
    }

    const { configMap } = parseResult.data;
    const k8s = await createK8sContext(req);
    const { k8sCore, k8sApp, namespace } = k8s;

    let app: V1Deployment | V1StatefulSet;
    try {
      app = await k8s.getDeployApp(appName);

      if (!app?.spec?.template?.spec) {
        return jsonRes(res, {
          code: 400,
          error: `App ${appName} has invalid structure`
        });
      }
    } catch (error) {
      return jsonRes(res, {
        code: 404,
        error: `App ${appName} not found`
      });
    }

    const configMapData: Record<string, string> = {};
    const volumeMounts: Array<{ name: string; mountPath: string; subPath: string }> = [];
    const volumeName = `${appName}-cm`;

    configMap.forEach((item) => {
      const key = mountPathToConfigMapKey(item.path);
      configMapData[key] = item.value || '';

      volumeMounts.push({
        name: volumeName,
        mountPath: item.path,
        subPath: key
      });
    });

    try {
      if (Object.keys(configMapData).length > 0) {
        try {
          await k8sCore.readNamespacedConfigMap(appName, namespace);
          await k8sCore.replaceNamespacedConfigMap(appName, namespace, {
            apiVersion: 'v1',
            kind: 'ConfigMap',
            metadata: { name: appName },
            data: configMapData
          });
        } catch (error: any) {
          if (error.response?.statusCode === 404) {
            await k8sCore.createNamespacedConfigMap(namespace, {
              apiVersion: 'v1',
              kind: 'ConfigMap',
              metadata: { name: appName },
              data: configMapData
            });
          } else {
            throw error;
          }
        }
      }

      const volumes =
        Object.keys(configMapData).length > 0
          ? [{ name: volumeName, configMap: { name: appName } }]
          : [];

      const strategicMergePatch = {
        spec: {
          template: {
            spec: {
              volumes: volumes,
              containers: [
                {
                  name: app.spec.template.spec.containers[0].name,
                  volumeMounts: volumeMounts
                }
              ]
            }
          }
        }
      };

      if (app.kind === 'Deployment') {
        await k8sApp.patchNamespacedDeployment(
          appName,
          namespace,
          strategicMergePatch,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          { headers: { 'Content-type': PatchUtils.PATCH_FORMAT_STRATEGIC_MERGE_PATCH } }
        );
      } else if (app.kind === 'StatefulSet') {
        await k8sApp.patchNamespacedStatefulSet(
          appName,
          namespace,
          strategicMergePatch,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          { headers: { 'Content-type': PatchUtils.PATCH_FORMAT_STRATEGIC_MERGE_PATCH } }
        );
      }

      const response = await getAppByName(appName, k8s);
      const filteredData = await processAppResponse(response);

      return jsonRes(res, {
        data: filteredData
      });
    } catch (error: any) {
      console.error('Failed to update ConfigMap:', error);
      return jsonRes(res, {
        code: 500,
        error: error.message || 'Failed to update ConfigMap'
      });
    }
  } catch (error: any) {
    console.error('Error in ConfigMap handler:', error);
    return jsonRes(res, {
      code: 500,
      error: error.message || 'Internal server error'
    });
  }
}
