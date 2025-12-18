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
  createK8sContext,
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
  constructor(
    message: string,
    public code: number = 500,
    public details?: any
  ) {
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
    // Ignore deletion errors
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
    res.status(404).json({ error: `App ${name} not found` });
    return false;
  }
}

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
        `Cannot set isPublic for non-application protocol. Current protocol: ${finalAppProtocol || updatedNetwork.protocol}`,
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

async function manageAppPorts(
  appName: string,
  requestPorts: any[],
  currentAppData: AppEditType,
  k8s: any
): Promise<AppEditType> {
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

  return updatedAppData;
}

function handlePortError(error: any, res: NextApiResponse): void {
  const errorTypes = {
    [PortConflictError.name]: 'PORT_CONFLICT_ERROR',
    [PortNotFoundError.name]: 'PORT_NOT_FOUND_ERROR',
    [PortValidationError.name]: 'PORT_VALIDATION_ERROR',
    [PortError.name]: 'PORT_OPERATION_ERROR'
  };

  if (error instanceof PortError) {
    res.status(error.code).json({
      error: {
        type: errorTypes[error.name] || 'PORT_OPERATION_ERROR',
        message: error.message,
        details: error.details
      }
    });
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { method } = req;
    const { name } = req.query as { name: string };

    const k8s = await createK8sContext(req);

    if (method === 'GET') {
      const parseResult = GetAppByAppNameQuerySchema.safeParse(req.query);

      if (!parseResult.success) {
        return res.status(400).json({
          error: 'Invalid request params.',
          details: parseResult.error.issues
        });
      }

      if (!(await validateAppExists(name, k8s, res))) {
        return;
      }

      const response = await getAppByName(name, k8s);
      const filteredData = await processAppResponseV2Alpha(response, name, k8s.namespace);

      return res.status(200).json(filteredData);
    } else if (method === 'DELETE') {
      const parseResult = DeleteAppByNameQuerySchema.safeParse(req.query);

      if (!parseResult.success) {
        return res.status(400).json({
          error: 'Invalid request params.',
          details: parseResult.error.issues
        });
      }

      await deleteAppByName(name, k8s);

      return res.status(204).end();
    } else if (method === 'PATCH') {
      const parseResult = UpdateAppResourcesSchema.safeParse(req.body);

      if (!parseResult.success) {
        return res.status(400).json({
          error: 'Invalid request body.',
          details: parseResult.error.issues
        });
      }

      if (!(await validateAppExists(name, k8s, res))) {
        return;
      }

      const updateData = parseResult.data;

      try {
        let currentAppData: AppEditType | null = null;
        if (updateData.ports !== undefined) {
          const currentAppResponse = await getAppByName(name, k8s);
          currentAppData = await processAppResponse(currentAppResponse, false);
          if (!currentAppData) {
            throw new Error(`App ${name} not found`);
          }
        }

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
            currentAppData = await manageAppPorts(name, updateData.ports, currentAppData!, k8s);
          } catch (error: any) {
            if (error instanceof PortError) {
              handlePortError(error, res);
              return;
            }
            throw error;
          }
        }

        return res.status(204).end();
      } catch (error: any) {
        return res.status(500).json({
          error: error.message || 'Failed to update application',
          details: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
      }
    } else {
      res.setHeader('Allow', ['GET', 'DELETE', 'PATCH']);
      return res.status(405).json({
        error: 'Method not allowed'
      });
    }
  } catch (err: any) {
    return res.status(500).json({
      error: err.message || 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
}
