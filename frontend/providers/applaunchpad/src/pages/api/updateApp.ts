import type { NextApiRequest, NextApiResponse } from 'next';
import { ApiResp } from '@/services/kubernet';
import { handleK8sError, jsonRes } from '@/services/backend/response';
import { YamlKindEnum } from '@/utils/adapt';
import yaml from 'js-yaml';
import type { CustomObjectsApi, V1StatefulSet } from '@kubernetes/client-node';
import { PatchUtils } from '@kubernetes/client-node';
import type { AppPatchPropsType } from '@/types/app';
import { errLog, infoLog, warnLog } from 'sealos-desktop-sdk';
import type { V1Service } from '@kubernetes/client-node';
import { generateOwnerReference, shouldHaveOwnerReference } from '@/utils/deployYaml2Json';
import { appDeployKey } from '@/constants/app';
import { buildExternalUrl } from '@/utils/network-url';
import { ResponseCode } from '@/types/response';
import { createK8sContext } from '@/services/backend';
import { isNetworkIsolationAvailable } from '@/services/backend/networkIsolationCapability';
import { syncExistingNetworkIsolationIfPresent } from '@/services/backend/networkIsolation';

export type Props = {
  patch: AppPatchPropsType;
  stateFulSetYaml?: string;
  appName: string;
};

const normalizeDnsName = (name: string) => name.trim().toLowerCase().replace(/\.+$/g, '');

const normalizeIngressResource = <T extends Record<string, any>>(resource: T): T => {
  if (resource.kind !== YamlKindEnum.Ingress) {
    return resource;
  }

  resource.spec?.rules?.forEach((rule: any) => {
    if (typeof rule.host === 'string') {
      rule.host = normalizeDnsName(rule.host);
    }
  });
  resource.spec?.tls?.forEach((tls: any) => {
    if (Array.isArray(tls.hosts)) {
      tls.hosts = tls.hosts.map((host: string) =>
        typeof host === 'string' ? normalizeDnsName(host) : host
      );
    }
  });

  return resource;
};

const normalizeCertificateResource = <T extends Record<string, any>>(resource: T): T => {
  if (resource.kind !== YamlKindEnum.Certificate) {
    return resource;
  }

  if (Array.isArray(resource.spec?.dnsNames)) {
    resource.spec.dnsNames = resource.spec.dnsNames.map((name: string) =>
      typeof name === 'string' ? normalizeDnsName(name) : name
    );
  }

  return resource;
};

const normalizeNetworkResource = <T extends Record<string, any>>(resource: T): T =>
  normalizeCertificateResource(normalizeIngressResource(resource));

const isWorkloadKind = (kind?: string) =>
  kind === YamlKindEnum.Deployment || kind === YamlKindEnum.StatefulSet;

type CreatePatchItem = Extract<AppPatchPropsType[number], { type: 'create' }>;
type CreateResourceItem = {
  item: CreatePatchItem;
  resource: Record<string, any>;
};

const getK8sErrorCode = (error: any) =>
  error?.body?.code || error?.response?.body?.code || error?.response?.statusCode;

const ignoreNotFound = async <T>(promise: Promise<T>) => {
  try {
    return await promise;
  } catch (error: any) {
    if (Number(getK8sErrorCode(error)) === 404) {
      return undefined;
    }
    throw error;
  }
};

async function getWorkloadOwnerReferences({
  k8sApp,
  namespace,
  appName,
  kind
}: {
  k8sApp: {
    readNamespacedDeployment: (name: string, namespace: string) => Promise<any>;
    readNamespacedStatefulSet: (name: string, namespace: string) => Promise<any>;
  };
  namespace: string;
  appName: string;
  kind?: 'Deployment' | 'StatefulSet';
}) {
  const readWorkload = async (targetKind: 'Deployment' | 'StatefulSet') => {
    const workload =
      targetKind === 'Deployment'
        ? await k8sApp.readNamespacedDeployment(appName, namespace)
        : await k8sApp.readNamespacedStatefulSet(appName, namespace);
    const uid = workload.body.metadata?.uid;
    if (!uid) {
      throw new Error(`${targetKind} UID is empty`);
    }
    return generateOwnerReference(appName, targetKind, uid);
  };

  if (kind) {
    return readWorkload(kind);
  }

  try {
    return await readWorkload('Deployment');
  } catch (error: any) {
    if (Number(getK8sErrorCode(error)) !== 404) {
      throw error;
    }
    return readWorkload('StatefulSet');
  }
}

const withOwnerReferences = (
  yamlStr: string,
  ownerReferences: ReturnType<typeof generateOwnerReference>
) => {
  const resource = normalizeNetworkResource(yaml.load(yamlStr) as any);
  if (resource?.kind && shouldHaveOwnerReference(resource.kind)) {
    resource.metadata = resource.metadata || {};
    resource.metadata.ownerReferences = ownerReferences;
    infoLog('Added ownerReferences to new resource', {
      kind: resource.kind,
      name: resource.metadata.name
    });
  }
  return yaml.dump(resource);
};

async function patchExistingOwnerReferences({
  k8sCore,
  k8sNetworkingApp,
  k8sAutoscaling,
  k8sCustomObjects,
  namespace,
  appName,
  ownerReferences
}: {
  k8sCore: any;
  k8sNetworkingApp: any;
  k8sAutoscaling: any;
  k8sCustomObjects: CustomObjectsApi;
  namespace: string;
  appName: string;
  ownerReferences: ReturnType<typeof generateOwnerReference>;
}) {
  const mergePatchOptions = {
    headers: { 'Content-type': PatchUtils.PATCH_FORMAT_JSON_MERGE_PATCH }
  };
  const ownerReferencePatch = {
    metadata: {
      ownerReferences
    }
  };
  const labelSelector = `${appDeployKey}=${appName}`;

  const patchServices = k8sCore
    .listNamespacedService(namespace, undefined, undefined, undefined, undefined, labelSelector)
    .then((res: { body: { items: V1Service[] } }) =>
      Promise.all(
        res.body.items.map((service) =>
          service.metadata?.name
            ? k8sCore.patchNamespacedService(
                service.metadata.name,
                namespace,
                ownerReferencePatch,
                undefined,
                undefined,
                undefined,
                undefined,
                undefined,
                mergePatchOptions
              )
            : undefined
        )
      )
    );

  const patchIngresses = k8sNetworkingApp
    .listNamespacedIngress(namespace, undefined, undefined, undefined, undefined, labelSelector)
    .then((res: { body: { items: Array<{ metadata?: { name?: string } }> } }) =>
      Promise.all(
        res.body.items.map((ingress) =>
          ingress.metadata?.name
            ? k8sNetworkingApp.patchNamespacedIngress(
                ingress.metadata.name,
                namespace,
                ownerReferencePatch,
                undefined,
                undefined,
                undefined,
                undefined,
                undefined,
                mergePatchOptions
              )
            : undefined
        )
      )
    );

  const patchPvcs = k8sCore
    .listNamespacedPersistentVolumeClaim(
      namespace,
      undefined,
      undefined,
      undefined,
      undefined,
      `app=${appName}`
    )
    .then((res: { body: { items: Array<{ metadata?: { name?: string } }> } }) =>
      Promise.all(
        res.body.items.map((pvc) =>
          pvc.metadata?.name
            ? k8sCore.patchNamespacedPersistentVolumeClaim(
                pvc.metadata.name,
                namespace,
                ownerReferencePatch,
                undefined,
                undefined,
                undefined,
                undefined,
                undefined,
                mergePatchOptions
              )
            : undefined
        )
      )
    );

  const patchAppNamedResources = Promise.all([
    ignoreNotFound(
      k8sCore.patchNamespacedConfigMap(
        appName,
        namespace,
        ownerReferencePatch,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        mergePatchOptions
      )
    ),
    ignoreNotFound(
      k8sCore.patchNamespacedSecret(
        appName,
        namespace,
        ownerReferencePatch,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        mergePatchOptions
      )
    ),
    ignoreNotFound(
      k8sAutoscaling.patchNamespacedHorizontalPodAutoscaler(
        appName,
        namespace,
        ownerReferencePatch,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        mergePatchOptions
      )
    )
  ]);

  const patchCustomObjects = async (plural: 'issuers' | 'certificates') => {
    const response = await ignoreNotFound(
      k8sCustomObjects.listNamespacedCustomObject(
        'cert-manager.io',
        'v1',
        namespace,
        plural,
        undefined,
        undefined,
        undefined,
        undefined,
        labelSelector
      )
    );
    const items = ((response as any)?.body?.items || []) as Array<{ metadata?: { name?: string } }>;

    await Promise.all(
      items.map((item) =>
        item.metadata?.name
          ? k8sCustomObjects.patchNamespacedCustomObject(
              'cert-manager.io',
              'v1',
              namespace,
              plural,
              item.metadata.name,
              ownerReferencePatch,
              undefined,
              undefined,
              undefined,
              mergePatchOptions
            )
          : undefined
      )
    );
  };

  await Promise.all([
    patchServices,
    patchIngresses,
    patchPvcs,
    patchAppNamedResources,
    patchCustomObjects('issuers'),
    patchCustomObjects('certificates')
  ]);
}

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

    const newUrl = buildExternalUrl({
      protocol: 'HTTP',
      host,
      config: {
        disableHttps: !!global.AppConfig?.cloud?.disableHttps,
        cloudPort: global.AppConfig?.cloud?.port,
        httpPort: global.AppConfig?.cloud?.httpPort
      }
    });
    const appCrUrlPatch = {
      op: 'replace',
      path: '/spec/data/url',
      value: newUrl
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

    infoLog('Successfully updated AppCR URL', { newUrl });
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
    const k8sContext = await createK8sContext(req);
    const {
      applyYamlList,
      k8sApp,
      k8sCore,
      k8sNetworkingApp,
      k8sAutoscaling,
      k8sCustomObjects,
      namespace
    } = k8sContext;

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
          // patch -> replace; fail closed if both fail
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
            return { recreated: false, kind: YamlKindEnum.StatefulSet };
          } catch (patchError) {
            try {
              await k8sApp.replaceNamespacedStatefulSet(appName, namespace, jsonPatch);
              return { recreated: false, kind: YamlKindEnum.StatefulSet };
            } catch (replaceError) {
              warnLog('statefulSet patch/replace failed; not falling back to delete/create', {
                yaml: yaml.dump(jsonPatch)
              });
              throw replaceError || patchError;
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

    const patchItems = patch.filter(
      (item): item is Extract<AppPatchPropsType[number], { type: 'patch' }> => {
        const cr = crMap[item.kind];
        return !!cr && item.type === 'patch' && !!item.value?.metadata;
      }
    );
    const workloadPatches = patchItems.filter((item) => isWorkloadKind(item.kind));
    const regularPatches = patchItems.filter((item) => !isWorkloadKind(item.kind));
    const applyPatchItem = (
      item: Extract<AppPatchPropsType[number], { type: 'patch' }>
    ): Promise<any> | undefined => {
      const cr = crMap[item.kind];
      if (!cr) return;
      normalizeNetworkResource(item.value);
      infoLog('patch cr', { kind: item.kind, name: item.value?.metadata?.name });
      return cr.patch(item.value);
    };

    // Patch ConfigMap/Service/etc. first. Workload patches can create fresh Pods, so run them
    // after referenced resources are patched or created.
    await Promise.all(regularPatches.map(applyPatchItem));

    // create
    const createItems = patch
      .map((item) => {
        const cr = crMap[item.kind];
        if (!cr || item.type !== 'create') {
          return;
        }
        const resource = normalizeNetworkResource(yaml.load(item.value as string) as any);
        return {
          item,
          resource
        };
      })
      .filter((item): item is CreateResourceItem => !!item?.resource);

    const workloadCreateItems = createItems.filter(
      ({ resource }) => isWorkloadKind(resource.kind) && resource.metadata?.name === appName
    );
    const dependentCreateItems = createItems.filter(
      ({ resource }) => !isWorkloadKind(resource.kind) || resource.metadata?.name !== appName
    );
    const replacingWorkload =
      workloadCreateItems.length > 0 &&
      patch.some(
        (item) => item.type === 'delete' && isWorkloadKind(item.kind) && item.name === appName
      );
    let createdWorkloadOwnerReferences: ReturnType<typeof generateOwnerReference> | undefined;

    if (workloadCreateItems.length > 0) {
      await applyYamlList(
        workloadCreateItems.map(({ resource }) => yaml.dump(resource)),
        'create'
      );

      const createdWorkloadKind = workloadCreateItems[0].resource.kind as
        'Deployment' | 'StatefulSet';
      createdWorkloadOwnerReferences = await getWorkloadOwnerReferences({
        k8sApp,
        namespace,
        appName,
        kind: createdWorkloadKind
      });

      if (dependentCreateItems.length > 0) {
        await applyYamlList(
          dependentCreateItems.map(({ resource }) =>
            withOwnerReferences(yaml.dump(resource), createdWorkloadOwnerReferences!)
          ),
          'create'
        );
      }
    } else if (dependentCreateItems.length > 0) {
      try {
        const ownerReferences = await getWorkloadOwnerReferences({
          k8sApp,
          namespace,
          appName
        });
        await applyYamlList(
          dependentCreateItems.map(({ resource }) =>
            withOwnerReferences(yaml.dump(resource), ownerReferences)
          ),
          'create'
        );
      } catch (error) {
        warnLog('Could not find workload for ownerReferences', { appName });
        await applyYamlList(
          dependentCreateItems.map(({ resource }) => yaml.dump(resource)),
          'create'
        );
      }
    }

    const workloadPatchResults = await Promise.all(workloadPatches.map(applyPatchItem));
    const recreatedWorkloadPatch = workloadPatchResults.find((result) => result?.recreated);

    if (recreatedWorkloadPatch) {
      createdWorkloadOwnerReferences = await getWorkloadOwnerReferences({
        k8sApp,
        namespace,
        appName,
        kind: recreatedWorkloadPatch.kind
      });
    }

    if (createdWorkloadOwnerReferences && (replacingWorkload || recreatedWorkloadPatch)) {
      await patchExistingOwnerReferences({
        k8sCore,
        k8sNetworkingApp,
        k8sAutoscaling,
        k8sCustomObjects,
        namespace,
        appName,
        ownerReferences: createdWorkloadOwnerReferences
      });
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

    if (!(await isNetworkIsolationAvailable())) {
      try {
        await syncExistingNetworkIsolationIfPresent(appName, k8sContext);
      } catch (error) {
        errLog('Existing network isolation maintenance failed', {
          appName,
          error
        });
      }
    }

    return jsonRes(res);
  } catch (err: any) {
    return jsonRes(res, handleK8sError(err, { forbiddenCode: ResponseCode.FORBIDDEN }));
  }
}
