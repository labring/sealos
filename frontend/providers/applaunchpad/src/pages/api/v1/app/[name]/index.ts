import {
  GetAppByAppNameQuerySchema,
  DeleteAppByNameQuerySchema,
  UpdateAppResourcesSchema,
  nanoid
} from '@/types/request_schema';
import { jsonRes } from '@/services/backend/response';
import { ApiResp } from '@/services/kubernet';
import type { NextApiRequest, NextApiResponse } from 'next';
import {
  getAppByName,
  deleteAppByName,
  createK8sContext,
  updateAppResources,
  processAppResponse
} from '@/services/backend';
import {
  PatchUtils,
  V1Deployment,
  V1StatefulSet,
  V1PersistentVolumeClaim
} from '@kubernetes/client-node';
import { mountPathToConfigMapKey } from '@/utils/tools';
import { json2DeployCr, json2Service, json2Ingress } from '@/utils/deployYaml2Json';
import type { AppEditType } from '@/types/app';
import { appDeployKey } from '@/constants/app';

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

async function validateAppExists(name: string, k8s: any, res: NextApiResponse<ApiResp>) {
  try {
    await k8s.getDeployApp(name);
    return true;
  } catch (error: any) {
    jsonRes(res, {
      code: 404,
      error: `App ${name} not found`
    });
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

  // If configMapData is empty, delete the ConfigMap and remove volume mounts
  if (!configMapData || configMapData.length === 0) {
    try {
      await k8sCore.deleteNamespacedConfigMap(appName, namespace);
    } catch (error: any) {
      if (error.response?.statusCode !== 404) {
        throw error;
      }
    }

    // Remove volume mounts and volumes
    const strategicMergePatch = {
      spec: {
        template: {
          spec: {
            volumes: [],
            containers: [
              {
                name: app.spec.template.spec.containers[0].name,
                volumeMounts: []
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
    return;
  }

  const configMapDataRecord: Record<string, string> = {};
  const volumeMounts: Array<{ name: string; mountPath: string; subPath: string }> = [];
  const volumeName = `${appName}-cm`;

  configMapData.forEach((item) => {
    const key = mountPathToConfigMapKey(item.path);
    configMapDataRecord[key] = item.value || '';

    volumeMounts.push({
      name: volumeName,
      mountPath: item.path,
      subPath: key
    });
  });

  // Create or replace ConfigMap
  try {
    await k8sCore.readNamespacedConfigMap(appName, namespace);
    await k8sCore.replaceNamespacedConfigMap(appName, namespace, {
      apiVersion: 'v1',
      kind: 'ConfigMap',
      metadata: { name: appName },
      data: configMapDataRecord
    });
  } catch (error: any) {
    if (error.response?.statusCode === 404) {
      await k8sCore.createNamespacedConfigMap(namespace, {
        apiVersion: 'v1',
        kind: 'ConfigMap',
        metadata: { name: appName },
        data: configMapDataRecord
      });
    } else {
      throw error;
    }
  }

  const volumes = [{ name: volumeName, configMap: { name: appName } }];

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
}

// 修复后的 updateServiceAndIngress 函数
async function updateServiceAndIngress(appEditData: AppEditType, applyYamlList: any, k8s: any) {
  const yamlList: string[] = [];

  console.log(
    'updateServiceAndIngress - networks:',
    appEditData.networks?.map((n) => ({
      portName: n.portName,
      networkName: n.networkName,
      openPublicDomain: n.openPublicDomain,
      openNodePort: n.openNodePort,
      publicDomain: n.publicDomain,
      domain: n.domain,
      appProtocol: n.appProtocol,
      protocol: n.protocol
    }))
  );

  // 先删除所有旧的 Service 和 Ingress，然后创建新的
  try {
    const { k8sCore, k8sNetworkingApp, namespace } = k8s;

    // 删除所有旧的 Service
    await k8sCore.deleteCollectionNamespacedService(
      namespace,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      `${appDeployKey}=${appEditData.appName}`
    );

    // 删除所有旧的 Ingress
    await k8sNetworkingApp.deleteCollectionNamespacedIngress(
      namespace,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      `${appDeployKey}=${appEditData.appName}`
    );

    // 等待删除完成
    await new Promise((resolve) => setTimeout(resolve, 2000));
  } catch (error: any) {
    // 忽略 404 错误（资源不存在）
    if (error.response?.statusCode !== 404) {
      console.warn('Failed to delete old services/ingresses:', error.message);
    }
  }

  // 创建新的 Service 和 Ingress
  const hasServicePorts = appEditData.networks && appEditData.networks.length > 0;

  if (hasServicePorts) {
    const serviceYaml = json2Service(appEditData);
    console.log('Service YAML:', serviceYaml);
    if (serviceYaml.trim()) {
      yamlList.push(serviceYaml);
    }

    // Check if there are any ports that need ingress
    const hasIngressPorts = appEditData.networks.some(
      (network) => network.openPublicDomain && !network.openNodePort
    );

    console.log('Has ingress ports:', hasIngressPorts);

    if (hasIngressPorts) {
      const ingressYaml = json2Ingress(appEditData);
      console.log('Ingress YAML:', ingressYaml);
      if (ingressYaml.trim()) {
        yamlList.push(ingressYaml);
      }
    }
  }

  console.log('YAML list length:', yamlList.length);

  if (yamlList.length > 0) {
    try {
      // 使用 create 而不是 replace，因为我们已经删除了旧的资源
      await applyYamlList(yamlList, 'create');
      console.log('Successfully applied YAML');
    } catch (error: any) {
      console.error('Failed to apply YAML:', error.message || error);
      throw new Error(
        `Failed to update network configuration: ${error.message || 'Unknown error'}`
      );
    }
  }
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

  const { k8sCore, k8sApp, k8sAutoscaling, k8sNetworkingApp, namespace, applyYamlList } = k8s;

  // Check if we need to convert from Deployment to StatefulSet
  const needsConversion =
    currentAppData.kind === 'deployment' && storageData && storageData.length > 0;

  if (needsConversion) {
    // Convert from Deployment to StatefulSet
    console.log(`Converting ${appName} from Deployment to StatefulSet to support storage`);

    // Prepare the updated app data with storage
    const updatedAppData: AppEditType = { ...currentAppData };
    updatedAppData.kind = 'statefulset';
    updatedAppData.storeList = [];

    for (const newStore of storageData) {
      let numericValue = 1;
      const sizeMatch = newStore.size.match(/^(\d+(?:\.\d+)?)(Gi|Mi|Ti)$/i);
      if (sizeMatch) {
        const [, value, unit] = sizeMatch;
        numericValue = parseFloat(value);

        if (unit.toLowerCase() === 'mi') {
          numericValue = numericValue / 1024;
        } else if (unit.toLowerCase() === 'ti') {
          numericValue = numericValue * 1024;
        }
      }

      updatedAppData.storeList.push({
        name: mountPathToConfigMapKey(newStore.path),
        path: newStore.path,
        value: Math.ceil(numericValue)
      });
    }

    // Generate StatefulSet YAML
    const newStatefulSetYaml = json2DeployCr(updatedAppData, 'statefulset');

    // Delete all existing resources first
    try {
      // Delete the old Deployment
      await k8sApp.deleteNamespacedDeployment(appName, namespace);
    } catch (error: any) {
      if (error.response?.statusCode !== 404) {
        throw new Error(`Failed to delete Deployment: ${error.message}`);
      }
    }

    // Delete all old Services
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
    } catch (error: any) {
      if (error.response?.statusCode !== 404) {
        console.warn('Failed to delete old services:', error.message);
      }
    }

    // Delete all old Ingresses
    try {
      await k8sNetworkingApp.deleteCollectionNamespacedIngress(
        namespace,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        `${appDeployKey}=${appName}`
      );
    } catch (error: any) {
      if (error.response?.statusCode !== 404) {
        console.warn('Failed to delete old ingresses:', error.message);
      }
    }

    // Wait for deletion to complete
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // Create new StatefulSet with storage
    const yamlList = [newStatefulSetYaml];

    // Add service and ingress if needed
    const hasServicePorts = updatedAppData.networks && updatedAppData.networks.length > 0;

    if (hasServicePorts) {
      const serviceYaml = json2Service(updatedAppData);
      if (serviceYaml.trim()) {
        yamlList.push(serviceYaml);
      }

      // Check if there are any ports that need ingress
      const hasIngressPorts = updatedAppData.networks.some(
        (network) => network.openPublicDomain && !network.openNodePort
      );

      if (hasIngressPorts) {
        const ingressYaml = json2Ingress(updatedAppData);
        if (ingressYaml.trim()) {
          yamlList.push(ingressYaml);
        }
      }
    }

    await applyYamlList(yamlList, 'create');

    return;
  }

  // Handle StatefulSet to Deployment conversion (when removing all storage)
  if (currentAppData.kind === 'statefulset' && (!storageData || storageData.length === 0)) {
    console.log(`Removing storage from ${appName}, keeping as StatefulSet`);

    // Keep as StatefulSet but remove storage
    const updatedAppData: AppEditType = { ...currentAppData };
    updatedAppData.storeList = [];

    const newStatefulSetYaml = json2DeployCr(updatedAppData, 'statefulset');

    // Delete the old StatefulSet
    await k8sApp.deleteNamespacedStatefulSet(
      appName,
      namespace,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined
    );

    // Wait for deletion
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Create new StatefulSet without storage
    await applyYamlList([newStatefulSetYaml], 'create');

    // Delete all PVCs
    try {
      await k8sCore.deleteCollectionNamespacedPersistentVolumeClaim(
        namespace,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        `app=${appName}`
      );
    } catch (error: any) {
      // Ignore errors when deleting PVCs
    }

    return;
  }

  // Regular StatefulSet storage update (no type conversion needed)
  if (currentAppData.kind === 'statefulset') {
    // Validate storage data
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

    // Create completely new storage list (replacement, not merge)
    const updatedAppData: AppEditType = { ...currentAppData };
    updatedAppData.storeList = [];

    for (const newStore of storageData) {
      let numericValue = 1;
      const sizeMatch = newStore.size.match(/^(\d+(?:\.\d+)?)(Gi|Mi|Ti)$/i);
      if (sizeMatch) {
        const [, value, unit] = sizeMatch;
        numericValue = parseFloat(value);

        if (unit.toLowerCase() === 'mi') {
          numericValue = numericValue / 1024;
        } else if (unit.toLowerCase() === 'ti') {
          numericValue = numericValue * 1024;
        }
      }

      updatedAppData.storeList.push({
        name: mountPathToConfigMapKey(newStore.path),
        path: newStore.path,
        value: Math.ceil(numericValue)
      });
    }

    const newStatefulSetYaml = json2DeployCr(updatedAppData, 'statefulset');

    await k8sApp.deleteNamespacedStatefulSet(
      appName,
      namespace,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined
    );

    // Wait for deletion
    await new Promise((resolve) => setTimeout(resolve, 2000));

    await applyYamlList([newStatefulSetYaml], 'create');

    await new Promise((resolve) => setTimeout(resolve, 2000));

    try {
      await updateExistingPVCs(k8sCore, namespace, appName, storageData);
    } catch (pvcError: any) {
      // Log but don't fail if PVC update fails
      console.error('PVC update error:', pvcError);
    }
  }
}

async function updateExistingPVCs(
  k8sCore: any,
  namespace: string,
  appName: string,
  newStorageConfig: Array<{ path: string; size: string }>
) {
  try {
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

    if (!allPvc || allPvc.length === 0) {
      return;
    }

    const boundPVCs = allPvc.filter(
      (pvc: V1PersistentVolumeClaim) => pvc.status?.phase === 'Bound'
    );

    if (boundPVCs.length === 0) {
      return;
    }

    const pathSet = new Set(newStorageConfig.map((storage) => storage.path));
    if (pathSet.size !== newStorageConfig.length) {
      throw new Error('Duplicate storage paths are not allowed');
    }

    const nameSet = new Set(
      newStorageConfig.map((storage) => mountPathToConfigMapKey(storage.path))
    );
    if (nameSet.size !== newStorageConfig.length) {
      throw new Error('Duplicate storage names (generated from paths) are not allowed');
    }

    const updatePromises = boundPVCs.map(async (pvc: V1PersistentVolumeClaim) => {
      const pvcName = pvc.metadata?.name;
      const pvcPath = pvc.metadata?.annotations?.path;
      const newStorageItem = newStorageConfig.find((storage) => storage.path === pvcPath);
      if (!pvcName || !pvcPath || !newStorageItem) {
        return;
      }
      if (pvc.status?.phase === 'Pending') {
        return;
      }

      let newSizeValue = 1;
      if (newStorageItem.size) {
        const match = newStorageItem.size.match(/^(\d+)/);
        if (match) {
          newSizeValue = parseInt(match[1]);
        } else {
          throw new Error(`Invalid storage size format: ${newStorageItem.size}`);
        }
      }

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
          if (pvc.status?.phase !== 'Bound') {
            return;
          }

          await k8sCore.patchNamespacedPersistentVolumeClaim(
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
          );
        } catch (patchError: any) {
          const errorMessage =
            patchError.body?.message || patchError.message || 'HTTP request failed';
          throw new Error(`Failed to expand PVC ${pvcName}: ${errorMessage}`);
        }
      }
    });

    await Promise.all(updatePromises);
  } catch (error: any) {
    throw error;
  }
}

async function updateAppPorts(
  app: V1Deployment | V1StatefulSet,
  appName: string,
  k8sApp: any,
  namespace: string,
  targetPorts: any[]
) {
  const jsonPatch = [
    {
      op: 'replace',
      path: '/spec/template/spec/containers/0/ports',
      value: targetPorts
    }
  ];

  try {
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
        { headers: { 'Content-type': 'application/json-patch+json' } }
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
        { headers: { 'Content-type': 'application/json-patch+json' } }
      );
    } else {
      throw new Error(`Unsupported app kind: ${app.kind}`);
    }
  } catch (error: any) {
    if (error.response) {
      throw new Error(`K8s API error: ${error.response.body?.message || error.message}`);
    }
    throw error;
  }
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
  const deploymentResult = latestAppResponse[0];
  const statefulSetResult = latestAppResponse[1];

  if (deploymentResult.status === 'fulfilled' && deploymentResult.value.body) {
    app = deploymentResult.value.body;
  } else if (statefulSetResult.status === 'fulfilled' && statefulSetResult.value.body) {
    app = statefulSetResult.value.body;
  } else {
    throw new Error(`App ${appName} not found in Kubernetes`);
  }

  const existingNetworks = [...(latestAppData.networks || [])];
  let resultNetworks: any[] = [];

  // If requestPorts is provided, it's a complete replacement
  if (requestPorts !== undefined) {
    // Build a new ports list based on requestPorts
    const newNetworks: any[] = [];

    for (const portConfig of requestPorts) {
      // Check if this is an update (has portName) or a new port
      const existingNetwork = portConfig.portName
        ? existingNetworks.find((n) => n.portName === portConfig.portName)
        : null;

      if (existingNetwork) {
        // Update existing port
        let updatedNetwork = { ...existingNetwork };

        // Update port number if provided
        if (portConfig.number !== undefined) {
          // Check for conflicts
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
          updatedNetwork.port = portConfig.number;
        }

        // Update protocol if provided
        if (portConfig.protocol !== undefined) {
          const isApplicationProtocol = ['HTTP', 'GRPC', 'WS'].includes(portConfig.protocol);
          updatedNetwork.protocol = isApplicationProtocol ? 'TCP' : portConfig.protocol;
          updatedNetwork.appProtocol = isApplicationProtocol ? portConfig.protocol : undefined;
          updatedNetwork.openNodePort = !isApplicationProtocol;

          if (!isApplicationProtocol) {
            updatedNetwork.openPublicDomain = false;
            updatedNetwork.publicDomain = '';
            updatedNetwork.customDomain = '';
            updatedNetwork.domain = '';
          } else if (isApplicationProtocol && portConfig.exposesPublicDomain) {
            updatedNetwork.publicDomain = existingNetwork.publicDomain || nanoid();
            updatedNetwork.domain =
              existingNetwork.domain || global.AppConfig?.cloud?.domain || 'cloud.sealos.io';
          }
        }

        // Update exposesPublicDomain if provided
        if (portConfig.exposesPublicDomain !== undefined) {
          const finalAppProtocol = updatedNetwork.appProtocol;
          const isApplicationProtocol = ['HTTP', 'GRPC', 'WS'].includes(finalAppProtocol || '');

          if (isApplicationProtocol) {
            updatedNetwork.openPublicDomain = portConfig.exposesPublicDomain;

            if (portConfig.exposesPublicDomain) {
              updatedNetwork.publicDomain = updatedNetwork.publicDomain || nanoid();
              updatedNetwork.domain =
                updatedNetwork.domain || global.AppConfig?.cloud?.domain || 'cloud.sealos.io';

              if (!updatedNetwork.networkName) {
                updatedNetwork.networkName = `network-${nanoid()}`;
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
              `Cannot set exposesPublicDomain for non-application protocol. Current protocol: ${finalAppProtocol || updatedNetwork.protocol}`,
              {
                currentAppProtocol: finalAppProtocol,
                currentProtocol: updatedNetwork.protocol,
                supportedProtocols: ['HTTP', 'GRPC', 'WS'],
                operation: 'UPDATE_PUBLIC_DOMAIN'
              }
            );
          }
        }

        newNetworks.push(updatedNetwork);
      } else if (!portConfig.portName) {
        // Create new port (no portName means it's a new port)
        if (!portConfig.number) {
          throw new PortValidationError('Port number is required for creating new ports', {
            portConfig,
            operation: 'CREATE_PORT_VALIDATION'
          });
        }

        // Check for conflicts with existing ports
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

        // Check for conflicts with other new ports
        const conflictingNewPort = newNetworks.find((n) => n.port === portConfig.number);
        if (conflictingNewPort) {
          throw new PortConflictError(`Cannot create duplicate port ${portConfig.number}`, {
            operation: 'CREATE_PORT_DUPLICATE'
          });
        }

        const isApplicationProtocol = ['HTTP', 'GRPC', 'WS'].includes(
          portConfig.protocol || 'HTTP'
        );
        const newNetwork = {
          serviceName: `service-${nanoid()}`,
          networkName: `network-${nanoid()}`,
          portName: nanoid(),
          port: portConfig.number,
          protocol: isApplicationProtocol ? 'TCP' : portConfig.protocol || 'TCP',
          appProtocol: isApplicationProtocol ? portConfig.protocol || 'HTTP' : undefined,
          openPublicDomain:
            isApplicationProtocol &&
            (portConfig.exposesPublicDomain !== undefined ? portConfig.exposesPublicDomain : false),
          publicDomain: isApplicationProtocol ? nanoid() : '',
          customDomain: '',
          domain: isApplicationProtocol ? global.AppConfig?.cloud?.domain || 'cloud.sealos.io' : '',
          nodePort: undefined,
          openNodePort: !isApplicationProtocol
        };

        newNetworks.push(newNetwork);
      }
      // If portConfig has portName but the port doesn't exist in existingNetworks, it will be ignored (not added to newNetworks)
    }

    resultNetworks = newNetworks;
  } else {
    resultNetworks = [...existingNetworks];
  }

  // Allow empty networks - remove the validation that required at least one port

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

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResp>) {
  try {
    const { method } = req;
    const { name } = req.query as { name: string };

    const k8s = await createK8sContext(req);

    if (!(await validateAppExists(name, k8s, res))) {
      return;
    }

    if (method === 'GET') {
      const parseResult = GetAppByAppNameQuerySchema.safeParse(req.query);

      if (!parseResult.success) {
        return jsonRes(res, {
          code: 400,
          error: parseResult.error
        });
      }

      const response = await getAppByName(name, k8s);
      const filteredData = await processAppResponse(response);

      jsonRes(res, {
        data: filteredData
      });
    } else if (method === 'DELETE') {
      const parseResult = DeleteAppByNameQuerySchema.safeParse(req.query);

      if (!parseResult.success) {
        return jsonRes(res, {
          code: 400,
          error: parseResult.error
        });
      }

      await deleteAppByName(name, k8s);

      jsonRes(res, {
        message: 'successfully deleted'
      });
    } else if (method === 'PATCH') {
      const parseResult = UpdateAppResourcesSchema.safeParse(req.body);

      if (!parseResult.success) {
        return jsonRes(res, {
          code: 400,
          error: parseResult.error
        });
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
          updateData.resource ||
          updateData.launchCommand !== undefined ||
          updateData.image ||
          updateData.env
        ) {
          const updateResourcesData = {
            ...updateData,
            command: updateData.launchCommand?.command,
            args: updateData.launchCommand?.args,
            image: updateData.image?.imageName,
            imageName: updateData.image?.imageName,
            ...(updateData.image && {
              imageRegistry:
                updateData.image.imageRegistry === null ? null : updateData.image.imageRegistry
            })
          };

          const { launchCommand, image, ...resourceUpdateData } = updateResourcesData;

          await updateAppResources(name, resourceUpdateData, k8s);
        }

        // ConfigMap is complete replacement - empty array removes all
        if (updateData.configMap !== undefined) {
          await updateConfigMap(name, updateData.configMap, k8s);
        }

        // Storage is complete replacement - empty array removes all
        if (updateData.storage !== undefined) {
          await updateStorage(name, updateData.storage, k8s);
        }

        // Ports is complete replacement when provided
        if (updateData.ports !== undefined) {
          try {
            currentAppData = await manageAppPorts(name, updateData.ports, currentAppData!, k8s);
          } catch (error: any) {
            if (error instanceof PortConflictError) {
              return jsonRes(res, {
                code: error.code,
                error: {
                  type: 'PORT_CONFLICT_ERROR',
                  message: error.message,
                  details: error.details
                }
              });
            }

            if (error instanceof PortNotFoundError) {
              return jsonRes(res, {
                code: error.code,
                error: {
                  type: 'PORT_NOT_FOUND_ERROR',
                  message: error.message,
                  details: error.details
                }
              });
            }

            if (error instanceof PortValidationError) {
              return jsonRes(res, {
                code: error.code,
                error: {
                  type: 'PORT_VALIDATION_ERROR',
                  message: error.message,
                  details: error.details
                }
              });
            }

            if (error instanceof PortError) {
              return jsonRes(res, {
                code: error.code,
                error: {
                  type: 'PORT_OPERATION_ERROR',
                  message: error.message,
                  details: error.details
                }
              });
            }

            throw error;
          }
        }

        const response = await getAppByName(name, k8s);
        const filteredData = await processAppResponse(response);

        console.log('Final response data:', JSON.stringify(filteredData, null, 2));

        jsonRes(res, {
          data: filteredData
        });
      } catch (error: any) {
        return jsonRes(res, {
          code: 500,
          error: error.message || 'Failed to update application'
        });
      }
    } else {
      res.setHeader('Allow', ['GET', 'DELETE', 'PATCH']);
      return jsonRes(res, {
        code: 405,
        error: `Method ${method} Not Allowed`
      });
    }
  } catch (err: any) {
    jsonRes(res, {
      code: 500,
      error: err
    });
  }
}
