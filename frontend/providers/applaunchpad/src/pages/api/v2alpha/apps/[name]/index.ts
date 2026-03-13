import {
  GetAppByAppNameQuerySchema,
  DeleteAppByNameQuerySchema,
  UpdateAppResourcesSchema,
  nanoid,
  transformFromLegacySchema
} from '@/types/v2alpha/request_schema';
import type { NextApiRequest, NextApiResponse } from 'next';
import {
  getAppByName,
  deleteAppByName,
  updateAppResources,
  processAppResponse
} from '@/services/backend';
import { adaptAppDetail } from '@/utils/adapt';
import { DeployKindsType, AppEditType, AppDetailType } from '@/types/app';
import { z } from 'zod';
import { LaunchpadApplicationSchema } from '@/types/v2alpha/schema';
import {
  PatchUtils,
  V1Deployment,
  V1StatefulSet,
  V1PersistentVolumeClaim
} from '@kubernetes/client-node';
import { mountPathToConfigMapKey } from '@/utils/tools';
import { json2DeployCr, json2Service, json2Ingress } from '@/utils/deployYaml2Json';
import { appDeployKey } from '@/constants/app';

import {
  sendError,
  sendValidationError,
  ErrorType,
  ErrorCode,
  type ApiErrorDetails
} from '@/types/v2alpha/error';
import {
  getK8sContextOrSendError,
  sendK8sOperationError,
  sendInternalError
} from '@/pages/api/v2alpha/k8sContext';

// Constants
const DELAY_SHORT = 2000;
const DELAY_LONG = 3000;
const APPLICATION_PROTOCOLS = ['HTTP', 'GRPC', 'WS'] as const;
const SIZE_UNITS = {
  MI: 1 / 1024,
  GI: 1,
  TI: 1024
} as const;

// Custom Error Classes
class PortError extends Error {
  constructor(message: string, public code: number = 500, public details?: ApiErrorDetails) {
    super(message);
    this.name = 'PortError';
  }
}

class PortConflictError extends PortError {
  constructor(message: string, details?: any) {
    super(message, 409, details);
    this.name = 'PortConflictError';
  }
}

class PortNotFoundError extends PortError {
  constructor(message: string, details?: any) {
    super(message, 404, details);
    this.name = 'PortNotFoundError';
  }
}

class PortValidationError extends PortError {
  constructor(message: string, details?: any) {
    super(message, 400, details);
    this.name = 'PortValidationError';
  }
}

// Utility Functions
function isApplicationProtocol(protocol?: string): boolean {
  if (!protocol) return false;
  const upperProtocol = protocol.toUpperCase();
  return APPLICATION_PROTOCOLS.includes(upperProtocol as any);
}

function convertStorageSize(size: string): number {
  const sizeMatch = size.match(/^(\d+(?:\.\d+)?)(Gi|Mi|Ti)$/i);
  if (!sizeMatch) return 1;

  const [, value, unit] = sizeMatch;
  const numericValue = parseFloat(value);
  const multiplier = SIZE_UNITS[unit.toUpperCase() as keyof typeof SIZE_UNITS] ?? 1;

  return Math.ceil(numericValue * multiplier);
}

function validateStorageData(storageData: Array<{ path: string; size: string }>): void {
  const paths = storageData.map((s) => s.path);
  if (new Set(paths).size !== paths.length) {
    throw new Error('Duplicate storage paths are not allowed');
  }

  for (const store of storageData) {
    if (!store.size.match(/^\d+(\.\d+)?(Gi|Mi|Ti)$/i)) {
      throw new Error(
        `Invalid storage size format: ${store.size}. Use format like "10Gi", "1Ti", etc.`
      );
    }

    if (!store.path.startsWith('/')) {
      throw new Error(`Storage path must be absolute: ${store.path}`);
    }
  }
}

async function patchK8sResource(
  app: V1Deployment | V1StatefulSet,
  appName: string,
  k8sApp: any,
  namespace: string,
  jsonPatch: any[]
): Promise<void> {
  const patchOptions = {
    headers: { 'Content-type': PatchUtils.PATCH_FORMAT_JSON_PATCH }
  };

  if (app.kind === 'Deployment') {
    await k8sApp.patchNamespacedDeployment(
      appName,
      namespace,
      jsonPatch,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      patchOptions
    );
  } else if (app.kind === 'StatefulSet') {
    await k8sApp.patchNamespacedStatefulSet(
      appName,
      namespace,
      jsonPatch,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      patchOptions
    );
  } else {
    throw new Error(`Unsupported app kind: ${app.kind}`);
  }
}

async function deleteK8sResource(
  k8sApp: any,
  appName: string,
  namespace: string,
  resourceType: 'Deployment' | 'StatefulSet'
): Promise<void> {
  try {
    if (resourceType === 'Deployment') {
      await k8sApp.deleteNamespacedDeployment(appName, namespace);
    } else {
      await k8sApp.deleteNamespacedStatefulSet(
        appName,
        namespace,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined
      );
    }
  } catch (error: any) {
    if (error.response?.statusCode !== 404) {
      throw new Error(`Failed to delete ${resourceType}: ${error.message}`);
    }
  }
}

async function deleteServiceAndIngress(k8s: any, appName: string): Promise<void> {
  const { k8sCore, k8sNetworkingApp, namespace } = k8s;

  try {
    await k8sCore.deleteCollectionNamespacedService(
      namespace,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      `${appDeployKey}=${appName}`
    );

    await k8sNetworkingApp.deleteCollectionNamespacedIngress(
      namespace,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      `${appDeployKey}=${appName}`
    );

    await new Promise((resolve) => setTimeout(resolve, DELAY_SHORT));
  } catch (error: any) {
    // 404 means the resource was already gone — safe to ignore.
    // Other errors (e.g. 403 Forbidden) are logged as warnings: if ignored silently they can
    // cause the subsequent 'create' call to fail with a confusing "AlreadyExists" 409 error.
    if (error?.response?.statusCode !== 404) {
      console.warn(
        `[deleteServiceAndIngress] Non-404 error while deleting Service/Ingress for "${appName}":`,
        error?.response?.statusCode,
        error?.message || error
      );
    }
  }
}

// Main Functions
async function processAppResponseV2Alpha(
  response: PromiseSettledResult<any>[],
  appName: string,
  namespace: string
): Promise<z.infer<typeof LaunchpadApplicationSchema>> {
  const responseData = response
    .map((item: PromiseSettledResult<any>) => {
      if (item.status === 'fulfilled') return item.value.body;
      if (item.status === 'rejected' && +item.reason?.body?.code === 404) return null;
      if (item.status === 'rejected') {
        throw item.reason?.body || item.reason || new Error('Get APP Deployment Error');
      }
      return null;
    })
    .filter((item): item is DeployKindsType => item !== null)
    .flat() as DeployKindsType[];

  const appDetailData: AppDetailType = await adaptAppDetail(responseData, {
    SEALOS_DOMAIN: global.AppConfig.cloud.domain,
    SEALOS_USER_DOMAINS: global.AppConfig.cloud.userDomains
  });

  const standardizedData = transformFromLegacySchema(appDetailData, appName, namespace);
  return LaunchpadApplicationSchema.parse(standardizedData);
}

async function validateAppExists(name: string, k8s: any, res: NextApiResponse): Promise<boolean> {
  try {
    await k8s.getDeployApp(name);
    return true;
  } catch (error: any) {
    sendError(res, {
      status: 404,
      type: ErrorType.RESOURCE_ERROR,
      code: ErrorCode.NOT_FOUND,
      message: `Application "${name}" not found in the current namespace. Please verify the application name.`
    });
    return false;
  }
}

// NOTE: All JSONPatch paths below target containers[0]. This is safe because the LaunchPad
// application model places the user container at index 0. Sidecar containers injected by
// admission webhooks are appended after index 0 and do not affect this invariant.
async function updateConfigMap(
  appName: string,
  configMapData: Array<{ path: string; value?: string }>,
  k8s: any
): Promise<void> {
  const { k8sCore, k8sApp, namespace } = k8s;

  let app: V1Deployment | V1StatefulSet;
  try {
    app = await k8s.getDeployApp(appName);

    if (!app?.spec?.template?.spec) {
      throw new Error(`App ${appName} has invalid structure`);
    }
  } catch (error) {
    throw new Error(`App ${appName} not found`);
  }

  const volumeName = `${appName}-cm`;

  // Delete ConfigMap if no data
  if (!configMapData || configMapData.length === 0) {
    try {
      await k8sCore.deleteNamespacedConfigMap(appName, namespace);
    } catch (error: any) {
      if (error.response?.statusCode !== 404) throw error;
    }

    const jsonPatch = [
      {
        op: 'replace',
        path: '/spec/template/spec/volumes',
        value: app.spec.template.spec.volumes?.filter((v: any) => v.name !== volumeName) || []
      },
      {
        op: 'replace',
        path: '/spec/template/spec/containers/0/volumeMounts',
        value:
          app.spec.template.spec.containers[0].volumeMounts?.filter(
            (vm: any) => vm.name !== volumeName
          ) || []
      }
    ];

    await patchK8sResource(app, appName, k8sApp, namespace, jsonPatch);
    return;
  }

  // Create or update ConfigMap
  const configMapDataRecord: Record<string, string> = {};
  const volumeMounts: Array<{ name: string; mountPath: string; subPath: string }> = [];

  configMapData.forEach((item) => {
    const key = mountPathToConfigMapKey(item.path);
    configMapDataRecord[key] = item.value || '';
    volumeMounts.push({
      name: volumeName,
      mountPath: item.path,
      subPath: key
    });
  });

  const configMapSpec = {
    apiVersion: 'v1',
    kind: 'ConfigMap',
    metadata: { name: appName },
    data: configMapDataRecord
  };

  try {
    await k8sCore.readNamespacedConfigMap(appName, namespace);
    await k8sCore.replaceNamespacedConfigMap(appName, namespace, configMapSpec);
  } catch (error: any) {
    if (error.response?.statusCode === 404) {
      await k8sCore.createNamespacedConfigMap(namespace, configMapSpec);
    } else {
      throw error;
    }
  }

  const currentVolumes = app.spec.template.spec.volumes || [];
  const currentVolumeMounts = app.spec.template.spec.containers[0].volumeMounts || [];

  const volumes = [
    ...currentVolumes.filter((v: any) => v.name !== volumeName),
    { name: volumeName, configMap: { name: appName } }
  ];

  const allVolumeMounts = [
    ...currentVolumeMounts.filter((vm: any) => vm.name !== volumeName),
    ...volumeMounts
  ];

  const jsonPatch = [
    { op: 'replace', path: '/spec/template/spec/volumes', value: volumes },
    { op: 'replace', path: '/spec/template/spec/containers/0/volumeMounts', value: allVolumeMounts }
  ];

  await patchK8sResource(app, appName, k8sApp, namespace, jsonPatch);
}

async function updateServiceAndIngress(
  appEditData: AppEditType,
  applyYamlList: any,
  k8s: any
): Promise<void> {
  await deleteServiceAndIngress(k8s, appEditData.appName);

  const yamlList: string[] = [];
  const hasServicePorts = appEditData.networks && appEditData.networks.length > 0;

  if (hasServicePorts) {
    const serviceYaml = json2Service(appEditData);
    if (serviceYaml.trim()) {
      yamlList.push(serviceYaml);
    }

    const hasIngressPorts = appEditData.networks.some(
      (network) => network.openPublicDomain && !network.openNodePort
    );

    if (hasIngressPorts) {
      const ingressYaml = json2Ingress(appEditData);
      if (ingressYaml.trim()) {
        yamlList.push(ingressYaml);
      }
    }
  }

  if (yamlList.length > 0) {
    try {
      await applyYamlList(yamlList, 'create');
    } catch (error: any) {
      console.error('Failed to apply YAML:', error.message || error);
      throw new Error(
        `Failed to update network configuration: ${error.message || 'Unknown error'}`
      );
    }
  }
}

function createStorageList(storageData: Array<{ path: string; size: string }>): any[] {
  return storageData.map((newStore) => ({
    name: mountPathToConfigMapKey(newStore.path),
    path: newStore.path,
    value: convertStorageSize(newStore.size)
  }));
}

async function convertToStatefulSet(
  appName: string,
  currentAppData: AppEditType,
  storageData: Array<{ path: string; size: string }>,
  k8s: any
): Promise<void> {
  const { k8sApp, k8sCore, k8sNetworkingApp, namespace, applyYamlList } = k8s;

  const updatedAppData: AppEditType = {
    ...currentAppData,
    kind: 'statefulset',
    storeList: createStorageList(storageData)
  };

  const newStatefulSetYaml = json2DeployCr(updatedAppData, 'statefulset');

  await deleteK8sResource(k8sApp, appName, namespace, 'Deployment');
  await deleteServiceAndIngress(k8s, appName);
  await new Promise((resolve) => setTimeout(resolve, DELAY_LONG));

  const yamlList = [newStatefulSetYaml];
  const hasServicePorts = updatedAppData.networks && updatedAppData.networks.length > 0;

  if (hasServicePorts) {
    const serviceYaml = json2Service(updatedAppData);
    if (serviceYaml.trim()) yamlList.push(serviceYaml);

    const hasIngressPorts = updatedAppData.networks.some(
      (network) => network.openPublicDomain && !network.openNodePort
    );

    if (hasIngressPorts) {
      const ingressYaml = json2Ingress(updatedAppData);
      if (ingressYaml.trim()) yamlList.push(ingressYaml);
    }
  }

  await applyYamlList(yamlList, 'create');
}

async function updateExistingPVCs(
  k8sCore: any,
  namespace: string,
  appName: string,
  newStorageConfig: Array<{ path: string; size: string }>
): Promise<void> {
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

  if (!allPvc || allPvc.length === 0) return;

  const boundPVCs = allPvc.filter((pvc: V1PersistentVolumeClaim) => pvc.status?.phase === 'Bound');
  if (boundPVCs.length === 0) return;

  const pathSet = new Set(newStorageConfig.map((storage) => storage.path));
  if (pathSet.size !== newStorageConfig.length) {
    throw new Error('Duplicate storage paths are not allowed');
  }

  const nameSet = new Set(newStorageConfig.map((storage) => mountPathToConfigMapKey(storage.path)));
  if (nameSet.size !== newStorageConfig.length) {
    throw new Error('Duplicate storage names (generated from paths) are not allowed');
  }

  const updatePromises = boundPVCs.map(async (pvc: V1PersistentVolumeClaim) => {
    const pvcName = pvc.metadata?.name;
    const pvcPath = pvc.metadata?.annotations?.path;
    const newStorageItem = newStorageConfig.find((storage) => storage.path === pvcPath);

    if (!pvcName || !pvcPath || !newStorageItem || pvc.status?.phase === 'Pending') {
      return;
    }

    const newSizeValue = convertStorageSize(newStorageItem.size);
    const currentSizeValue = parseInt(pvc.metadata?.annotations?.value || '1');

    if (newSizeValue < currentSizeValue) {
      throw new Error(
        `Cannot shrink PVC ${pvcName} from ${currentSizeValue}Gi to ${newSizeValue}Gi. PVC can only be expanded.`
      );
    }

    if (
      pvc.metadata?.annotations?.value &&
      pvc.spec?.resources?.requests?.storage &&
      pvc.metadata?.annotations?.value !== newSizeValue.toString()
    ) {
      const jsonPatch = [
        {
          op: 'replace',
          path: '/spec/resources/requests/storage',
          value: `${newSizeValue}Gi`
        },
        {
          op: 'replace',
          path: '/metadata/annotations/value',
          value: newSizeValue.toString()
        }
      ];

      try {
        if (pvc.status?.phase !== 'Bound') return;

        await k8sCore.patchNamespacedPersistentVolumeClaim(
          pvcName,
          namespace,
          jsonPatch,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          { headers: { 'Content-type': PatchUtils.PATCH_FORMAT_JSON_PATCH } }
        );
      } catch (patchError: any) {
        const errorMessage =
          patchError.body?.message || patchError.message || 'HTTP request failed';
        throw new Error(`Failed to expand PVC ${pvcName}: ${errorMessage}`);
      }
    }
  });

  await Promise.all(updatePromises);
}

async function updateStorage(
  appName: string,
  storageData: Array<{ path: string; size: string }>,
  k8s: any
): Promise<void> {
  const currentAppResponse = await getAppByName(appName, k8s);
  const currentAppData = await processAppResponse(currentAppResponse, false);

  if (!currentAppData) {
    throw new Error(`App ${appName} not found`);
  }

  const { k8sCore, k8sApp, applyYamlList } = k8s;
  const needsConversion =
    currentAppData.kind === 'deployment' && storageData && storageData.length > 0;

  if (needsConversion) {
    await convertToStatefulSet(appName, currentAppData, storageData, k8s);
    return;
  }

  if (currentAppData.kind === 'statefulset' && (!storageData || storageData.length === 0)) {
    const updatedAppData: AppEditType = {
      ...currentAppData,
      storeList: []
    };

    const newStatefulSetYaml = json2DeployCr(updatedAppData, 'statefulset');

    await deleteK8sResource(k8sApp, appName, k8s.namespace, 'StatefulSet');
    await new Promise((resolve) => setTimeout(resolve, DELAY_SHORT));
    await applyYamlList([newStatefulSetYaml], 'create');

    try {
      await k8sCore.deleteCollectionNamespacedPersistentVolumeClaim(
        k8s.namespace,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        `app=${appName}`
      );
    } catch (error: any) {
      // Ignore PVC deletion errors
    }

    return;
  }

  if (currentAppData.kind === 'statefulset') {
    validateStorageData(storageData);

    const updatedAppData: AppEditType = {
      ...currentAppData,
      storeList: createStorageList(storageData)
    };

    const newStatefulSetYaml = json2DeployCr(updatedAppData, 'statefulset');

    await deleteK8sResource(k8sApp, appName, k8s.namespace, 'StatefulSet');
    await new Promise((resolve) => setTimeout(resolve, DELAY_SHORT));
    await applyYamlList([newStatefulSetYaml], 'create');
    await new Promise((resolve) => setTimeout(resolve, DELAY_SHORT));

    try {
      await updateExistingPVCs(k8sCore, k8s.namespace, appName, storageData);
    } catch (pvcError: any) {
      console.error('PVC update error:', pvcError);
    }
  }
}

async function updateAppPorts(
  app: V1Deployment | V1StatefulSet,
  appName: string,
  k8sApp: any,
  namespace: string,
  targetPorts: any[]
): Promise<void> {
  const jsonPatch = [
    {
      op: 'replace',
      path: '/spec/template/spec/containers/0/ports',
      value: targetPorts
    }
  ];

  try {
    await patchK8sResource(app, appName, k8sApp, namespace, jsonPatch);
  } catch (error: any) {
    if (error.response) {
      throw new Error(`K8s API error: ${error.response.body?.message || error.message}`);
    }
    throw error;
  }
}

// Each field uses an independent nanoid: serviceName/networkName must be globally unique K8s
// resource names, portName is an internal lookup key, and publicDomain is the subdomain prefix.
// Using the same ID for any two fields would cause K8s naming conflicts or broken domain routing.
function createNetworkConfig(appName: string, portConfig: any): any {
  const protocol = (portConfig.protocol || 'http').toUpperCase();
  const isAppProtocol = isApplicationProtocol(protocol);

  return {
    serviceName: `${appName}-${portConfig.number}-${nanoid()}-service`,
    networkName: `${appName}-${portConfig.number}-${nanoid()}-network`,
    portName: nanoid(),
    port: portConfig.number,
    protocol: isAppProtocol ? 'TCP' : protocol,
    appProtocol: isAppProtocol ? protocol : undefined,
    openPublicDomain:
      isAppProtocol && (portConfig.isPublic !== undefined ? portConfig.isPublic : false),
    publicDomain: isAppProtocol ? nanoid() : '',
    customDomain: '',
    domain: isAppProtocol ? global.AppConfig?.cloud?.domain || 'cloud.sealos.io' : '',
    nodePort: undefined,
    openNodePort: !isAppProtocol
  };
}

function updateNetworkConfig(existingNetwork: any, portConfig: any, appName: string): any {
  let updatedNetwork = { ...existingNetwork };

  if (portConfig.number !== undefined) {
    updatedNetwork.port = portConfig.number;
  }

  if (portConfig.protocol !== undefined) {
    const protocolUpper = portConfig.protocol.toUpperCase();
    const isAppProtocol = isApplicationProtocol(protocolUpper);
    updatedNetwork.protocol = isAppProtocol ? 'TCP' : protocolUpper;
    updatedNetwork.appProtocol = isAppProtocol ? protocolUpper : undefined;
    updatedNetwork.openNodePort = !isAppProtocol;

    if (!isAppProtocol) {
      updatedNetwork.openPublicDomain = false;
      updatedNetwork.publicDomain = '';
      updatedNetwork.customDomain = '';
      updatedNetwork.domain = '';
    } else if (portConfig.isPublic) {
      updatedNetwork.publicDomain = existingNetwork.publicDomain || nanoid();
      updatedNetwork.domain =
        existingNetwork.domain || global.AppConfig?.cloud?.domain || 'cloud.sealos.io';
    }
  }

  if (portConfig.isPublic !== undefined) {
    const finalAppProtocol = updatedNetwork.appProtocol;
    const isAppProtocol = isApplicationProtocol(finalAppProtocol);

    if (isAppProtocol) {
      updatedNetwork.openPublicDomain = portConfig.isPublic;

      if (portConfig.isPublic) {
        updatedNetwork.publicDomain = updatedNetwork.publicDomain || nanoid();
        updatedNetwork.domain =
          updatedNetwork.domain || global.AppConfig?.cloud?.domain || 'cloud.sealos.io';

        if (!updatedNetwork.networkName) {
          updatedNetwork.networkName = `${appName}-${updatedNetwork.port}-${nanoid()}-network`;
        }

        if (!updatedNetwork.appProtocol) {
          updatedNetwork.appProtocol = 'HTTP';
        }
      } else {
        updatedNetwork.publicDomain = '';
        updatedNetwork.customDomain = '';
        updatedNetwork.domain = '';
      }
    } else {
      throw new PortValidationError(
        `Cannot set isPublic for non-application protocol. Current protocol: ${
          finalAppProtocol || updatedNetwork.protocol
        }`,
        {
          currentAppProtocol: finalAppProtocol,
          currentProtocol: updatedNetwork.protocol,
          supportedProtocols: APPLICATION_PROTOCOLS,
          operation: 'UPDATE_PUBLIC_DOMAIN'
        }
      );
    }
  }

  return updatedNetwork;
}

async function manageAppPorts(appName: string, requestPorts: any[], k8s: any): Promise<void> {
  const { k8sApp, namespace, applyYamlList } = k8s;

  const latestAppResponse = await getAppByName(appName, k8s);
  const latestAppData = await processAppResponse(latestAppResponse, false);

  if (!latestAppData) {
    throw new Error(`Failed to get latest app data for ${appName}`);
  }

  let app: V1Deployment | V1StatefulSet;
  const [deploymentResult, statefulSetResult] = latestAppResponse;

  if (deploymentResult.status === 'fulfilled' && deploymentResult.value.body) {
    app = deploymentResult.value.body;
  } else if (statefulSetResult.status === 'fulfilled' && statefulSetResult.value.body) {
    app = statefulSetResult.value.body;
  } else {
    throw new Error(`App ${appName} not found in Kubernetes`);
  }

  const existingNetworks = [...(latestAppData.networks || [])];
  let resultNetworks: any[] = [];

  if (requestPorts !== undefined) {
    const newNetworks: any[] = [];

    for (const portConfig of requestPorts) {
      const existingNetwork = portConfig.portName
        ? existingNetworks.find((n) => n.portName === portConfig.portName)
        : null;

      if (existingNetwork) {
        // Update existing port
        if (portConfig.number !== undefined) {
          const conflictingNetwork = existingNetworks.find(
            (n) => n.port === portConfig.number && n.portName !== existingNetwork.portName
          );
          if (conflictingNetwork) {
            throw new PortConflictError(
              `Cannot update to port ${portConfig.number}: already in use by another port`,
              {
                conflictingPortDetails: {
                  port: conflictingNetwork.port,
                  portName: conflictingNetwork.portName,
                  serviceName: conflictingNetwork.serviceName
                },
                requestedPort: portConfig.number,
                operation: 'UPDATE_PORT_CONFLICT'
              }
            );
          }
        }

        const updatedNetwork = updateNetworkConfig(existingNetwork, portConfig, appName);
        newNetworks.push(updatedNetwork);
      } else if (!portConfig.portName) {
        // Create new port
        if (!portConfig.number) {
          throw new PortValidationError('Port number is required for creating new ports', {
            portConfig,
            operation: 'CREATE_PORT_VALIDATION'
          });
        }

        const conflictingNetwork = existingNetworks.find((n) => n.port === portConfig.number);
        if (conflictingNetwork) {
          throw new PortConflictError(`Cannot create port ${portConfig.number}: already exists`, {
            existingPortDetails: {
              port: conflictingNetwork.port,
              portName: conflictingNetwork.portName,
              serviceName: conflictingNetwork.serviceName
            },
            operation: 'CREATE_PORT_CONFLICT'
          });
        }

        const conflictingNewPort = newNetworks.find((n) => n.port === portConfig.number);
        if (conflictingNewPort) {
          throw new PortConflictError(`Cannot create duplicate port ${portConfig.number}`, {
            operation: 'CREATE_PORT_DUPLICATE'
          });
        }

        const newNetwork = createNetworkConfig(appName, portConfig);
        newNetworks.push(newNetwork);
      } else {
        // portConfig.portName was provided but no matching port was found: fail explicitly
        // instead of silently dropping it (which would also delete the port under replace semantics)
        throw new PortNotFoundError(
          `Port "${portConfig.portName}" not found in application "${appName}". Verify the portName or omit it to create a new port.`,
          { portName: portConfig.portName, operation: 'UPDATE_PORT_NOT_FOUND' }
        );
      }
    }

    resultNetworks = newNetworks;
  } else {
    resultNetworks = [...existingNetworks];
  }

  const targetContainerPorts = resultNetworks.map((network) => ({
    containerPort: network.port,
    name: network.portName,
    protocol: network.protocol
  }));

  await updateAppPorts(app, appName, k8sApp, namespace, targetContainerPorts);

  const updatedAppData: AppEditType = {
    ...latestAppData,
    networks: resultNetworks
  };

  await updateServiceAndIngress(updatedAppData, applyYamlList, k8s);
}

function handlePortError(error: any, res: NextApiResponse): void {
  if (error instanceof PortConflictError) {
    sendError(res, {
      status: error.code,
      type: ErrorType.RESOURCE_ERROR,
      code: ErrorCode.CONFLICT,
      message: error.message,
      details: error.details
    });
  } else if (error instanceof PortNotFoundError) {
    sendError(res, {
      status: error.code,
      type: ErrorType.RESOURCE_ERROR,
      code: ErrorCode.NOT_FOUND,
      message: error.message,
      details: error.details
    });
  } else if (error instanceof PortValidationError) {
    sendError(res, {
      status: error.code,
      type: ErrorType.VALIDATION_ERROR,
      code: ErrorCode.INVALID_PARAMETER,
      message: error.message,
      details: error.details
    });
  } else if (error instanceof PortError) {
    sendError(res, {
      status: error.code,
      type: ErrorType.OPERATION_ERROR,
      code: ErrorCode.OPERATION_FAILED,
      message: error.message,
      details: error.details
    });
  } else {
    // Safeguard: handlePortError should only be called with PortError instances.
    // This branch guards against accidental misuse (e.g. passing a plain Error).
    sendError(res, {
      status: 500,
      type: ErrorType.INTERNAL_ERROR,
      code: ErrorCode.INTERNAL_ERROR,
      message: 'An unexpected port error occurred.',
      details: error instanceof Error ? error.message : String(error)
    });
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { method } = req;
    const { name } = req.query as { name: string };

    const k8s = await getK8sContextOrSendError(req, res);
    if (!k8s) return;

    if (method === 'GET') {
      const parseResult = GetAppByAppNameQuerySchema.safeParse(req.query);

      if (!parseResult.success) {
        return sendValidationError(
          res,
          parseResult.error,
          'Application name path parameter is invalid or missing.'
        );
      }

      if (!(await validateAppExists(name, k8s, res))) {
        return;
      }

      try {
        const response = await getAppByName(name, k8s);
        const filteredData = await processAppResponseV2Alpha(response, name, k8s.namespace);
        return res.status(200).json(filteredData);
      } catch (err) {
        console.error('Get application error:', err);
        return sendK8sOperationError(
          res,
          err,
          `Failed to retrieve application "${name}". The Kubernetes operation encountered an error.`
        );
      }
    } else if (method === 'DELETE') {
      const parseResult = DeleteAppByNameQuerySchema.safeParse(req.query);

      if (!parseResult.success) {
        return sendValidationError(
          res,
          parseResult.error,
          'Application name path parameter is invalid or missing.'
        );
      }

      try {
        await deleteAppByName(name, k8s);
        return res.status(204).end();
      } catch (err: any) {
        // Resource already gone — deletion is still logically successful (idempotent)
        if (err?.response?.statusCode === 404 || err?.body?.code === 404) {
          return res.status(204).end();
        }
        console.error('Kubernetes delete application error:', err);
        return sendK8sOperationError(
          res,
          err,
          `Failed to delete application "${name}". The Kubernetes operation encountered an error.`
        );
      }
    } else if (method === 'PATCH') {
      const parseResult = UpdateAppResourcesSchema.safeParse(req.body);

      if (!parseResult.success) {
        return sendValidationError(
          res,
          parseResult.error,
          'Request body validation failed. Please check the update configuration format.'
        );
      }

      if (!(await validateAppExists(name, k8s, res))) {
        return;
      }

      const updateData = parseResult.data;

      try {
        if (
          updateData.quota ||
          updateData.launchCommand !== undefined ||
          updateData.image ||
          updateData.env
        ) {
          const updateResourcesData = {
            ...updateData,
            resource: updateData.quota,
            command: updateData.launchCommand?.command,
            args: updateData.launchCommand?.args,
            image: updateData.image?.imageName,
            imageName: updateData.image?.imageName,
            ...(updateData.image && {
              imageRegistry:
                updateData.image.imageRegistry === null
                  ? null
                  : updateData.image.imageRegistry
                  ? {
                      username: updateData.image.imageRegistry.username,
                      password: updateData.image.imageRegistry.password,
                      serverAddress: updateData.image.imageRegistry.apiUrl
                    }
                  : undefined
            })
          };

          const { launchCommand, image, quota, ...resourceUpdateData } = updateResourcesData;

          await updateAppResources(name, resourceUpdateData, k8s);
        }

        if (updateData.configMap !== undefined) {
          await updateConfigMap(name, updateData.configMap, k8s);
        }

        if (updateData.storage !== undefined) {
          await updateStorage(name, updateData.storage, k8s);
        }

        if (updateData.ports !== undefined) {
          try {
            await manageAppPorts(name, updateData.ports, k8s);
          } catch (error: any) {
            if (error instanceof PortError) {
              handlePortError(error, res);
              return;
            }
            throw error;
          }
        }

        return res.status(204).end();
      } catch (error) {
        console.error('Kubernetes update application error:', error);
        return sendK8sOperationError(
          res,
          error,
          `Failed to update application "${name}". The Kubernetes operation encountered an error.`
        );
      }
    } else {
      res.setHeader('Allow', ['GET', 'DELETE', 'PATCH']);
      return sendError(res, {
        status: 405,
        type: ErrorType.CLIENT_ERROR,
        code: ErrorCode.METHOD_NOT_ALLOWED,
        message: `HTTP method ${method} is not supported for this endpoint. Allowed methods: GET, DELETE, PATCH.`
      });
    }
  } catch (err) {
    console.error('Unexpected error in app handler:', err);
    return sendInternalError(
      res,
      err,
      'An unexpected error occurred while processing your request. Please try again or contact support.'
    );
  }
}
