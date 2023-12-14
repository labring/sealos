import type { NextApiRequest, NextApiResponse } from 'next';
import { ApiResp } from '@/services/kubernet';
import { jsonRes } from '@/services/backend/response';
import { YamlKindEnum } from '@/utils/adapt';
import yaml from 'js-yaml';
import type { V1StatefulSet } from '@kubernetes/client-node';
import { PatchUtils } from '@kubernetes/client-node';
import type { AppPatchPropsType } from '@/types/app';
import { initK8s } from 'sealos-desktop-sdk/service';
import { errLog, infoLog, warnLog } from 'sealos-desktop-sdk';

export type Props = {
  patch: AppPatchPropsType;
  stateFulSetYaml?: string;
  appName: string;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResp>) {
  const { patch, stateFulSetYaml, appName }: Props = req.body;
  if (!patch || patch.length === 0 || !appName) {
    jsonRes(res, {
      code: 500,
      error: 'params error'
    });
    return;
  }
  try {
    const {
      applyYamlList,
      k8sApp,
      k8sCore,
      k8sNetworkingApp,
      k8sAutoscaling,
      k8sCustomObjects,
      namespace
    } = await initK8s({ req });

    const crMap: Record<
      `${YamlKindEnum}`,
      {
        patch: (jsonPatch: Object) => Promise<any>;
        delete: (name: string) => Promise<any>;
      }
    > = {
      [YamlKindEnum.Deployment]: {
        patch: (jsonPatch: Object) =>
          k8sApp.patchNamespacedDeployment(
            appName,
            namespace,
            jsonPatch,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            { headers: { 'Content-type': PatchUtils.PATCH_FORMAT_JSON_MERGE_PATCH } }
          ),
        delete: (name) => k8sApp.deleteNamespacedDeployment(name, namespace)
      },
      [YamlKindEnum.StatefulSet]: {
        patch: async (jsonPatch: Object) => {
          // patch -> replace -> delete and create
          try {
            await k8sApp.patchNamespacedStatefulSet(
              appName,
              namespace,
              jsonPatch,
              undefined,
              undefined,
              undefined,
              undefined,
              undefined,
              { headers: { 'Content-type': PatchUtils.PATCH_FORMAT_JSON_MERGE_PATCH } }
            );
          } catch (error) {
            try {
              await k8sApp.replaceNamespacedStatefulSet(appName, namespace, jsonPatch);
            } catch (error) {
              warnLog('delete and create statefulSet', { yaml: yaml.dump(jsonPatch) });
              await k8sApp.deleteNamespacedStatefulSet(appName, namespace);
              await k8sApp.createNamespacedStatefulSet(namespace, jsonPatch);
            }
          }
        },
        delete: (name) => k8sApp.deleteNamespacedStatefulSet(name, namespace)
      },
      [YamlKindEnum.Service]: {
        patch: (jsonPatch: Object) =>
          k8sCore.replaceNamespacedService(appName, namespace, jsonPatch),
        delete: (name) => k8sCore.deleteNamespacedService(name, namespace)
      },
      [YamlKindEnum.ConfigMap]: {
        patch: (jsonPatch: any) =>
          k8sCore.replaceNamespacedConfigMap(jsonPatch?.metadata?.name, namespace, jsonPatch),
        delete: (name) => k8sCore.deleteNamespacedConfigMap(name, namespace)
      },
      [YamlKindEnum.Ingress]: {
        patch: (jsonPatch: any) =>
          k8sNetworkingApp.patchNamespacedIngress(
            jsonPatch?.metadata?.name,
            namespace,
            jsonPatch,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            { headers: { 'Content-type': PatchUtils.PATCH_FORMAT_JSON_MERGE_PATCH } }
          ),
        delete: (name) => k8sNetworkingApp.deleteNamespacedIngress(name, namespace)
      },
      [YamlKindEnum.Issuer]: {
        patch: (jsonPatch: Object) => {
          // @ts-ignore
          const name = jsonPatch?.metadata?.name;
          return k8sCustomObjects.patchNamespacedCustomObject(
            'cert-manager.io',
            'v1',
            namespace,
            'issuers',
            name,
            jsonPatch,
            undefined,
            undefined,
            undefined,
            { headers: { 'Content-type': PatchUtils.PATCH_FORMAT_JSON_MERGE_PATCH } }
          );
        },
        delete: (name) =>
          k8sCustomObjects.deleteNamespacedCustomObject(
            'cert-manager.io',
            'v1',
            namespace,
            'issuers',
            name
          )
      },
      [YamlKindEnum.Certificate]: {
        patch: (jsonPatch: Object) => {
          // @ts-ignore
          const name = jsonPatch?.metadata?.name;
          return k8sCustomObjects.patchNamespacedCustomObject(
            'cert-manager.io',
            'v1',
            namespace,
            'certificates',
            name,
            jsonPatch,
            undefined,
            undefined,
            undefined,
            { headers: { 'Content-type': PatchUtils.PATCH_FORMAT_JSON_MERGE_PATCH } }
          );
        },
        delete: (name) =>
          k8sCustomObjects.deleteNamespacedCustomObject(
            'cert-manager.io',
            'v1',
            namespace,
            'certificates',
            name
          )
      },
      [YamlKindEnum.HorizontalPodAutoscaler]: {
        patch: (jsonPatch: Object) =>
          k8sAutoscaling.patchNamespacedHorizontalPodAutoscaler(
            appName,
            namespace,
            jsonPatch,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            { headers: { 'Content-type': PatchUtils.PATCH_FORMAT_STRATEGIC_MERGE_PATCH } }
          ),
        delete: (name) => k8sAutoscaling.deleteNamespacedHorizontalPodAutoscaler(name, namespace)
      },
      [YamlKindEnum.Secret]: {
        patch: (jsonPatch: Object) =>
          k8sCore.patchNamespacedSecret(
            appName,
            namespace,
            jsonPatch,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            { headers: { 'Content-type': PatchUtils.PATCH_FORMAT_STRATEGIC_MERGE_PATCH } }
          ),
        delete: (name) => k8sCore.deleteNamespacedSecret(name, namespace)
      },
      [YamlKindEnum.PersistentVolumeClaim]: {
        patch: (jsonPatch: Object) => Promise.resolve(''),
        delete: () => Promise.resolve('')
      }
    };

    // update pvc data
    const stateFulSet = stateFulSetYaml ? (yaml.load(stateFulSetYaml) as V1StatefulSet) : {};
    // filer delete pvc
    const {
      body: { items: allPvc }
    } = await k8sCore.listNamespacedPersistentVolumeClaim(
      namespace,
      undefined,
      undefined,
      undefined,
      undefined,
      `app=${appName}`
    );

    // pvc update
    await Promise.all(
      allPvc.map((pvc) => {
        const volume = stateFulSet?.spec?.volumeClaimTemplates?.find(
          (volume) => volume.metadata?.annotations?.path === pvc.metadata?.annotations?.path
        );

        // check whether delete
        if (!volume) {
          infoLog(`delete pvc: ${pvc.metadata?.name}`);
          return k8sCore.deleteNamespacedPersistentVolumeClaim(pvc.metadata?.name || '', namespace);
        }
        // check storage change
        if (
          pvc.metadata?.name &&
          pvc.metadata?.annotations?.value &&
          pvc.spec?.resources?.requests?.storage &&
          pvc.metadata?.annotations?.value !== volume.metadata?.annotations?.value
        ) {
          const pvcName = pvc.metadata.name;
          const jsonPatch = [
            {
              op: 'replace',
              path: '/spec/resources/requests/storage',
              value: `${volume.metadata?.annotations?.value}Gi`
            },
            {
              op: 'replace',
              path: '/metadata/annotations/value',
              value: `${volume.metadata?.annotations?.value}`
            }
          ];
          infoLog(`replace ${pvcName} storage: ${volume.metadata?.annotations?.value}Gi`);
          return k8sCore
            .patchNamespacedPersistentVolumeClaim(
              pvcName,
              namespace,
              jsonPatch,
              undefined,
              undefined,
              undefined,
              undefined,
              undefined,
              {
                headers: { 'Content-type': PatchUtils.PATCH_FORMAT_JSON_PATCH }
              }
            )
            .catch((err) => {
              errLog(`replace pvc error: ${pvcName}`, err);
              return Promise.reject(err?.body);
            });
        }
      })
    );

    // patch
    await Promise.all(
      patch.map((item) => {
        const cr = crMap[item.kind];
        if (!cr || item.type !== 'patch' || !item.value?.metadata) {
          return;
        }
        infoLog('patch cr', { kind: item.kind, name: item.value?.metadata?.name });
        return cr.patch(item.value);
      })
    );

    // create
    const createYamlList = patch
      .map((item) => {
        const cr = crMap[item.kind];
        if (!cr || item.type !== 'create') {
          return;
        }
        return item.value;
      })
      .filter((item) => item);
    await applyYamlList(createYamlList as string[], 'create');

    // delete
    await Promise.all(
      patch.map((item) => {
        const cr = crMap[item.kind];
        if (!cr || item.type !== 'delete' || !item?.name) {
          return;
        }
        infoLog('delete cr', { kind: item.kind, name: item?.name });
        return cr.delete(item.name);
      })
    );

    jsonRes(res);
  } catch (err: any) {
    jsonRes(res, {
      code: 500,
      error: err
    });
  }
}
