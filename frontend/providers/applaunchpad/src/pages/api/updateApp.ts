import type { NextApiRequest, NextApiResponse } from 'next';
import { ApiResp } from '@/services/kubernet';
import { authSession } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
import { jsonRes } from '@/services/backend/response';
import { YamlKindEnum } from '@/utils/adapt';
import yaml from 'js-yaml';
import type { DeployKindsType } from '@/types/app';
import type { V1StatefulSet, V1PersistentVolumeClaim } from '@kubernetes/client-node';
import { PatchUtils } from '@kubernetes/client-node';

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResp>) {
  const { yamlList, appName }: { yamlList: string[]; appName: string } = req.body;
  if (!yamlList || yamlList.length === 0 || !appName) {
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

    // Resources that may need to be deleted
    const deleteArr = [
      {
        kind: YamlKindEnum.Deployment,
        delApi: () => k8sApp.deleteNamespacedDeployment(appName, namespace)
      },
      {
        kind: YamlKindEnum.ConfigMap,
        delApi: () => k8sCore.deleteNamespacedConfigMap(appName, namespace)
      },
      {
        kind: YamlKindEnum.Ingress,
        delApi: () => k8sNetworkingApp.deleteNamespacedIngress(appName, namespace)
      },
      {
        kind: YamlKindEnum.Issuer,
        delApi: () =>
          k8sCustomObjects.deleteNamespacedCustomObject(
            'cert-manager.io',
            'v1',
            namespace,
            'issuers',
            appName
          )
      },
      {
        kind: YamlKindEnum.Certificate,
        delApi: () =>
          k8sCustomObjects.deleteNamespacedCustomObject(
            'cert-manager.io',
            'v1',
            namespace,
            'certificates',
            appName
          )
      },
      {
        kind: YamlKindEnum.HorizontalPodAutoscaler,
        delApi: () => k8sAutoscaling.deleteNamespacedHorizontalPodAutoscaler(appName, namespace)
      },
      {
        kind: YamlKindEnum.Secret,
        delApi: () => k8sCore.deleteNamespacedSecret(appName, namespace)
      }
    ];

    // load all yaml to json
    const jsonYaml = yamlList.map((item) => yaml.loadAll(item)).flat() as DeployKindsType[];

    // get statefulSet yaml
    const stateFulSet = jsonYaml.find(
      (item) => item.kind === YamlKindEnum.StatefulSet
    ) as V1StatefulSet;

    // Compare kind, filter out the resources to be deleted
    const delArr = deleteArr.filter(
      (item) => !jsonYaml.find((yaml: any) => yaml.kind === item.kind)
    );

    // pvc
    let allPvc: V1PersistentVolumeClaim[] = [];
    if (stateFulSet && stateFulSet?.spec?.volumeClaimTemplates) {
      const {
        body: { items: data }
      } = await k8sCore.listNamespacedPersistentVolumeClaim(
        namespace,
        undefined,
        undefined,
        undefined,
        undefined,
        `app=${appName}`
      );
      allPvc = data;
    }

    // delete and patch  resource
    const deleteAndPatchRes = (
      await Promise.allSettled([
        k8sApp.deleteNamespacedStatefulSet(appName, namespace), // focus delete stateFulSEt
        ...delArr.map((item) => item.delApi().then(() => console.log(`delete ${item.kind}`))),
        ...allPvc.map((pvc) => {
          const volume = stateFulSet.spec?.volumeClaimTemplates?.find(
            (volume) => volume.metadata?.annotations?.path === pvc.metadata?.annotations?.path
          );
          // check whether delete
          if (!volume) {
            console.log(`delete pvc: ${pvc.metadata?.name}`);
            return k8sCore.deleteNamespacedPersistentVolumeClaim(
              pvc.metadata?.name || '',
              namespace
            );
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
                console.log(`delete pvc error:`);
                return Promise.reject(err?.body);
              });
          }
        })
      ])
    ).filter((item: any) => item?.reason?.statusCode !== 404);
    console.log('delete and patch result', deleteAndPatchRes);

    // apply new yaml
    const applyRes = await applyYamlList(yamlList, 'replace');

    jsonRes(res, {
      data: {
        applyRes,
        deleteAndPatchRes
      }
    });
  } catch (err: any) {
    jsonRes(res, {
      code: 500,
      error: err
    });
  }
}
