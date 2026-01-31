import type { NextApiRequest, NextApiResponse } from 'next';
import { ApiResp } from '@/services/kubernet';
import { jsonRes } from '@/services/backend/response';
import { YamlKindEnum } from '@/utils/adapt';
import yaml from 'js-yaml';
import type { CustomObjectsApi, V1StatefulSet } from '@kubernetes/client-node';
import { PatchUtils } from '@kubernetes/client-node';
import type { AppPatchPropsType } from '@/types/app';
import { initK8s } from 'sealos-desktop-sdk/service';
import { errLog, infoLog, warnLog } from 'sealos-desktop-sdk';
import type { V1Service } from '@kubernetes/client-node';
import { generateOwnerReference, shouldHaveOwnerReference } from '@/utils/deployYaml2Json';

export type Props = {
  patch: AppPatchPropsType;
  stateFulSetYaml?: string;
  appName: string;
};

async function updateAppCRUrl(
  k8sCustomObjects: CustomObjectsApi,
  namespace: string,
  appName: string,
  patch: AppPatchPropsType
) {
  try {
    const existingAppCr = (await k8sCustomObjects
      .getNamespacedCustomObject('app.sealos.io', 'v1', namespace, 'apps', appName)
      .catch((error) => {
        if (error.body.code !== 404) {
          throw new Error('Unexpected error when getting AppCR: ' + error.body.message);
        }
        return null;
      })) as {
      body: any;
    };

    if (!existingAppCr) {
      return;
    }

    const plainUrlRe = new RegExp(/^https?:\/\/[^\/]+\/?$/);
    if (!plainUrlRe.test(existingAppCr.body.spec.data.url)) {
      return;
    }

    const targetIngressPatch = patch.find(
      (item) =>
        item.kind === 'Ingress' &&
        item.type === 'patch' &&
        (item.value.spec.rules[0]?.http.paths[0]?.path === '/' ||
          item.value.spec.rules[0]?.http.paths[0]?.path === '/()(.*)') &&
        item.value.spec.rules[0]?.http.paths[0]?.pathType === 'Prefix'
    );

    if (!targetIngressPatch) {
      return;
    }

    const host = (targetIngressPatch as any).value.spec.rules[0]?.host;
    if (!host) {
      return;
    }

    const appCrUrlPatch = {
      op: 'replace',
      path: '/spec/data/url',
      value: `https://${host}`
    };

    await k8sCustomObjects.patchNamespacedCustomObject(
      'app.sealos.io',
      'v1',
      namespace,
      'apps',
      appName,
      [appCrUrlPatch],
      undefined,
      undefined,
      undefined,
      { headers: { 'Content-type': PatchUtils.PATCH_FORMAT_JSON_PATCH } }
    );

    infoLog('Successfully updated AppCR URL', { newUrl: `https://${host}` });
  } catch (error) {
    errLog('Failed to update AppCR URL', error);
  }
}

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
        patch: (jsonPatch: V1Service) =>
          k8sCore.replaceNamespacedService(
            jsonPatch?.metadata?.name || appName,
            namespace,
            jsonPatch
          ),
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

    // Add ownerReferences to newly created resources
    if (createYamlList.length > 0) {
      // Get workload UID
      let workloadUid: string | undefined;
      let workloadKind: 'Deployment' | 'StatefulSet' | undefined;

      try {
        // Try to read Deployment first
        const deployment = await k8sApp.readNamespacedDeployment(appName, namespace);
        workloadUid = deployment.body.metadata?.uid;
        workloadKind = 'Deployment';
      } catch (err: any) {
        if (err?.body?.code === 404) {
          // Try StatefulSet
          try {
            const statefulSet = await k8sApp.readNamespacedStatefulSet(appName, namespace);
            workloadUid = statefulSet.body.metadata?.uid;
            workloadKind = 'StatefulSet';
          } catch (err2) {
            warnLog('Could not find workload for ownerReferences', { appName });
          }
        }
      }

      // Add ownerReferences to new resources
      if (workloadUid && workloadKind) {
        const ownerReferences = generateOwnerReference(appName, workloadKind, workloadUid);
        const updatedCreateYamlList = createYamlList.map((yamlStr) => {
          const resource = yaml.load(yamlStr as string) as any;
          if (shouldHaveOwnerReference(resource.kind)) {
            if (!resource.metadata) {
              resource.metadata = {};
            }
            resource.metadata.ownerReferences = ownerReferences;
            infoLog('Added ownerReferences to new resource', {
              kind: resource.kind,
              name: resource.metadata.name
            });
          }
          return yaml.dump(resource);
        });
        await applyYamlList(updatedCreateYamlList, 'create');
      } else {
        await applyYamlList(createYamlList as string[], 'create');
      }
    }

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

    // Update AppCR URL in background (non-blocking)
    updateAppCRUrl(k8sCustomObjects, namespace, appName, patch).catch((error) => {
      errLog('AppCR URL update failed', error);
    });

    return jsonRes(res);
  } catch (err: any) {
    return jsonRes(res, {
      code: 500,
      error: err?.body
    });
  }
}
