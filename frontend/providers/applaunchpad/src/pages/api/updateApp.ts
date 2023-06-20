import type { NextApiRequest, NextApiResponse } from 'next';
import { ApiResp } from '@/services/kubernet';
import { authSession } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
import { jsonRes } from '@/services/backend/response';
import { YamlKindEnum } from '@/utils/adapt';
import yaml from 'js-yaml';
import type { V1StatefulSet, V1PersistentVolumeClaim } from '@kubernetes/client-node';
import { PatchUtils } from '@kubernetes/client-node';
import type { AppPatchPropsType } from '@/types/app';

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
    } = await getK8s({
      kubeconfig: await authSession(req.headers)
    });

    const crMap: Record<
      `${YamlKindEnum}`,
      {
        patch: (jsonPatch: Object) => Promise<any>;
        delete: () => Promise<any>;
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
        delete: () => k8sApp.deleteNamespacedDeployment(appName, namespace)
      },
      [YamlKindEnum.StatefulSet]: {
        patch: (jsonPatch: Object) =>
          k8sApp
            .deleteNamespacedStatefulSet(appName, namespace)
            .then(() => k8sApp.createNamespacedStatefulSet(namespace, jsonPatch)),
        delete: () => k8sApp.deleteNamespacedStatefulSet(appName, namespace)
      },
      [YamlKindEnum.Service]: {
        patch: (jsonPatch: Object) =>
          k8sCore.patchNamespacedService(
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
        delete: () => k8sCore.deleteNamespacedService(appName, namespace)
      },
      [YamlKindEnum.ConfigMap]: {
        patch: (jsonPatch: Object) =>
          k8sCore.patchNamespacedConfigMap(
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
        delete: () => k8sCore.deleteNamespacedConfigMap(appName, namespace)
      },
      [YamlKindEnum.Ingress]: {
        patch: (jsonPatch: Object) =>
          k8sNetworkingApp.patchNamespacedIngress(
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
        delete: () => k8sNetworkingApp.deleteNamespacedIngress(appName, namespace)
      },
      [YamlKindEnum.Issuer]: {
        patch: (jsonPatch: Object) =>
          k8sCustomObjects.patchNamespacedCustomObject(
            'cert-manager.io',
            'v1',
            namespace,
            'issuers',
            appName,
            jsonPatch,
            undefined,
            undefined,
            undefined,
            { headers: { 'Content-type': PatchUtils.PATCH_FORMAT_JSON_MERGE_PATCH } }
          ),
        delete: () =>
          k8sCustomObjects.deleteNamespacedCustomObject(
            'cert-manager.io',
            'v1',
            namespace,
            'issuers',
            appName
          )
      },
      [YamlKindEnum.Certificate]: {
        patch: (jsonPatch: Object) =>
          k8sCustomObjects.patchNamespacedCustomObject(
            'cert-manager.io',
            'v1',
            namespace,
            'certificates',
            appName,
            jsonPatch,
            undefined,
            undefined,
            undefined,
            { headers: { 'Content-type': PatchUtils.PATCH_FORMAT_JSON_MERGE_PATCH } }
          ),
        delete: () =>
          k8sCustomObjects.deleteNamespacedCustomObject(
            'cert-manager.io',
            'v1',
            namespace,
            'certificates',
            appName
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
        delete: () => k8sAutoscaling.deleteNamespacedHorizontalPodAutoscaler(appName, namespace)
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
        delete: () => k8sCore.deleteNamespacedSecret(appName, namespace)
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
    await Promise.all(
      allPvc.map((pvc) => {
        const volume = stateFulSet?.spec?.volumeClaimTemplates?.find(
          (volume) => volume.metadata?.annotations?.path === pvc.metadata?.annotations?.path
        );

        // check whether delete
        if (!volume) {
          console.log(`delete pvc: ${pvc.metadata?.name}`);
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
          console.log(`replace ${pvcName} storage: ${volume.metadata?.annotations?.value}Gi`);
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
              console.log(`replace pvc error:`);
              return Promise.reject(err?.body);
            });
        }
      })
    );

    // create
    await Promise.all(
      patch.map((item) => {
        const cr = crMap[item.kind];
        if (!cr || item.type !== 'create') {
          return;
        }
        return applyYamlList([item.value], 'create');
      })
    );

    // patch
    await Promise.all(
      patch.map((item) => {
        const cr = crMap[item.kind];
        if (!cr || item.type !== 'patch' || !item.value?.metadata) {
          return;
        }
        console.log('patch cr', item.kind);
        return cr.patch(item.value);
      })
    );

    // delete
    await Promise.all(
      patch.map((item) => {
        const cr = crMap[item.kind];
        if (!cr || item.type !== 'delete') {
          return;
        }
        console.log('delete cr', item.kind);
        return cr.delete();
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
