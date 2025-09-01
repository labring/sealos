import { NextApiRequest, NextApiResponse } from 'next';
import { jsonRes } from '@/services/backend/response';
import { K8sContext, createK8sContext, getAppByName, processAppResponse } from '@/services/backend';
import { V1Deployment, V1StatefulSet } from '@kubernetes/client-node';
import { CreatePortsSchema, UpdatePortsSchema, DeletePortsSchema } from '@/types/request_schema';
import { z } from 'zod';
import { customAlphabet } from 'nanoid';
import { json2Service, json2Ingress } from '@/utils/deployYaml2Json';
import type { AppEditType } from '@/types/app';

const nanoid = customAlphabet('abcdefghijklmnopqrstuvwxyz', 12);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (!['POST', 'PATCH', 'DELETE'].includes(req.method!)) {
      return jsonRes(res, {
        code: 405,
        error: `Method ${req.method} Not Allowed`
      });
    }

    const { name: appName } = req.query as { name: string };

    const k8s = await createK8sContext(req);
    const currentAppResponse = await getAppByName(appName, k8s);
    const currentAppData = await processAppResponse(currentAppResponse, false);

    if (req.method === 'DELETE') {
      const parseResult = DeletePortsSchema.safeParse(req.body);
      if (!parseResult.success) {
        return jsonRes(res, {
          code: 400,
          error: parseResult.error
        });
      }
      return await handleDeletePorts(parseResult.data.ports, appName, k8s, currentAppData, res);
    }

    let ports:
      | z.infer<typeof CreatePortsSchema>['ports']
      | z.infer<typeof UpdatePortsSchema>['ports'];
    if (req.method === 'POST') {
      const parseResult = CreatePortsSchema.safeParse(req.body);
      if (!parseResult.success) {
        return jsonRes(res, {
          code: 400,
          error: parseResult.error
        });
      }
      ports = parseResult.data.ports;
    } else {
      const parseResult = UpdatePortsSchema.safeParse(req.body);
      if (!parseResult.success) {
        return jsonRes(res, {
          code: 400,
          error: parseResult.error
        });
      }
      ports = parseResult.data.ports;
    }

    const { k8sApp, namespace, applyYamlList } = k8s;
    let app: V1Deployment | V1StatefulSet;

    const deploymentResult = currentAppResponse[0];
    const statefulSetResult = currentAppResponse[1];

    if (deploymentResult.status === 'fulfilled' && deploymentResult.value.body) {
      app = deploymentResult.value.body;
    } else if (statefulSetResult.status === 'fulfilled' && statefulSetResult.value.body) {
      app = statefulSetResult.value.body;
    } else {
      return jsonRes(res, {
        code: 404,
        error: `App ${appName} not found`
      });
    }

    if (!app?.spec?.template?.spec) {
      return jsonRes(res, {
        code: 400,
        error: `App ${appName} has invalid structure`
      });
    }

    const uniquePorts = new Set(ports.map((p) => p.port));
    if (uniquePorts.size !== ports.length) {
      return jsonRes(res, {
        code: 400,
        error: 'Duplicate ports are not allowed'
      });
    }

    if (req.method === 'POST') {
      const existingPorts = currentAppData.networks?.map((n) => n.port) || [];
      const conflictPorts = ports.filter((p) => existingPorts.includes(p.port));
      if (conflictPorts.length > 0) {
        return jsonRes(res, {
          code: 400,
          error: `Ports already exist: ${conflictPorts.map((p) => p.port).join(', ')}`
        });
      }
    }

    // Get existing port names to avoid conflicts
    const existingPortNames = new Set(currentAppData.networks?.map((n) => n.portName) || []);

    const networks = ports!.map((port) => {
      if (req.method === 'POST') {
        // Generate unique port name that doesn't conflict with existing ones
        let portName = nanoid();
        while (existingPortNames.has(portName)) {
          portName = nanoid();
        }
        existingPortNames.add(portName);

        return {
          serviceName: `service-${nanoid()}`,
          networkName: `network-${nanoid()}`,
          portName,
          port: port.port,
          protocol: port.protocol,
          appProtocol: port.appProtocol || 'HTTP',
          openPublicDomain: port.exposesPublicDomain,
          publicDomain: nanoid(),
          customDomain: '',
          domain: global.AppConfig?.cloud?.domain || 'cloud.sealos.io',
          nodePort: undefined,
          openNodePort: !port.appProtocol
        };
      } else {
        const portWithIds = port as z.infer<typeof UpdatePortsSchema>['ports'][0];
        const existingPort = currentAppData.networks?.find((n: any) => {
          // Match by specific identifiers in priority order
          if (portWithIds.portName && n.portName === portWithIds.portName) {
            return true;
          }
          if (portWithIds.networkName && n.networkName === portWithIds.networkName) {
            return true;
          }
          // Only match by serviceName if no other identifiers are provided
          if (
            !portWithIds.portName &&
            !portWithIds.networkName &&
            portWithIds.serviceName &&
            n.serviceName === portWithIds.serviceName
          ) {
            return true;
          }
          return false;
        });

        if (existingPort) {
          return {
            ...existingPort,
            port: portWithIds.port,
            protocol: portWithIds.protocol,
            appProtocol: portWithIds.appProtocol || 'HTTP',
            openPublicDomain: portWithIds.exposesPublicDomain,
            openNodePort: !portWithIds.appProtocol
          };
        } else {
          throw new Error(`Port not found for update: ${JSON.stringify(portWithIds)}`);
        }
      }
    });

    try {
      const containerPorts = networks.map((network) => ({
        containerPort: network.port,
        name: network.portName,
        protocol: network.protocol
      }));

      await updateAppPorts(app, appName, k8sApp, namespace, containerPorts, req.method);

      let mergedNetworks: any[];
      if (req.method === 'POST') {
        mergedNetworks = [...(currentAppData?.networks || []), ...networks];
      } else {
        const updatedPortNames = new Set(networks.map((n) => n.portName));
        mergedNetworks = [
          ...(currentAppData?.networks?.filter(
            (existing) => !updatedPortNames.has(existing.portName)
          ) || []),
          ...networks
        ];
      }

      // Check for duplicate port names in mergedNetworks
      const portNames = mergedNetworks.map((n) => n.portName);
      const duplicatePortNames = portNames.filter(
        (name, index) => portNames.indexOf(name) !== index
      );
      if (duplicatePortNames.length > 0) {
        console.error('Duplicate port names detected:', duplicatePortNames);
        console.error(
          'All networks:',
          mergedNetworks.map((n) => ({ port: n.port, portName: n.portName }))
        );
      }

      const appEditData: AppEditType = {
        ...currentAppData,
        networks: mergedNetworks
      };

      await updateServiceAndIngress(appEditData, applyYamlList);

      const response = await getAppByName(appName, k8s);
      const filteredData = await processAppResponse(response);

      return jsonRes(res, {
        data: filteredData
      });
    } catch (error: any) {
      return jsonRes(res, {
        code: 500,
        error: error?.message || `Failed to ports`
      });
    }
  } catch (error: any) {
    console.error('Error in ports handler:', error);
    return jsonRes(res, {
      code: 500,
      error: error.message || 'Internal server error'
    });
  }
}

async function updateAppPorts(
  app: V1Deployment | V1StatefulSet,
  appName: string,
  k8sApp: any,
  namespace: string,
  containerPorts: any[],
  method?: string
) {
  let jsonPatch: any[];

  if (method === 'POST') {
    const currentPorts = app.spec?.template?.spec?.containers[0]?.ports || [];
    const allPorts = [...currentPorts, ...containerPorts];
    jsonPatch = [
      {
        op: 'replace',
        path: '/spec/template/spec/containers/0/ports',
        value: allPorts
      }
    ];
  } else if (method === 'PATCH') {
    const currentPorts = app.spec?.template?.spec?.containers[0]?.ports || [];
    const updatedPorts = currentPorts.map((port: any) => {
      const updatedPort = containerPorts.find((cp: any) => cp.name === port.name);
      return updatedPort || port;
    });
    jsonPatch = [
      {
        op: 'replace',
        path: '/spec/template/spec/containers/0/ports',
        value: updatedPorts
      }
    ];
  } else if (method === 'DELETE') {
    const currentPorts = app.spec?.template?.spec?.containers[0]?.ports || [];
    const portsToDelete = new Set(containerPorts.map((cp: any) => cp.containerPort));
    const remainingPorts = currentPorts.filter(
      (port: any) => !portsToDelete.has(port.containerPort)
    );
    jsonPatch = [
      {
        op: 'replace',
        path: '/spec/template/spec/containers/0/ports',
        value: remainingPorts
      }
    ];
  } else {
    jsonPatch = [
      {
        op: 'replace',
        path: '/spec/template/spec/containers/0/ports',
        value: containerPorts
      }
    ];
  }

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
    throw error;
  }
}

async function updateServiceAndIngress(appEditData: AppEditType, applyYamlList: any) {
  const yamlList: string[] = [];

  const serviceYaml = json2Service(appEditData);
  if (serviceYaml.trim()) {
    yamlList.push(serviceYaml);
  }

  const ingressYaml = json2Ingress(appEditData);
  if (ingressYaml.trim()) {
    yamlList.push(ingressYaml);
  }

  if (yamlList.length > 0) {
    await applyYamlList(yamlList, 'replace');
  }
}

async function handleDeletePorts(
  portsToDelete: number[],
  appName: string,
  k8s: K8sContext,
  currentAppData: AppEditType,
  res: NextApiResponse
) {
  const remainingNetworks =
    currentAppData.networks?.filter((network) => !portsToDelete.includes(network.port)) || [];

  if (remainingNetworks.length === currentAppData.networks?.length) {
    return jsonRes(res, {
      code: 404,
      error: `No matching ports found to delete: ${portsToDelete.join(', ')}`
    });
  }

  try {
    const currentAppResponse = await getAppByName(appName, k8s);
    const { applyYamlList } = k8s;
    let app: V1Deployment | V1StatefulSet;

    const deploymentResult = currentAppResponse[0];
    const statefulSetResult = currentAppResponse[1];

    if (deploymentResult.status === 'fulfilled' && deploymentResult.value.body) {
      app = deploymentResult.value.body;
    } else if (statefulSetResult.status === 'fulfilled' && statefulSetResult.value.body) {
      app = statefulSetResult.value.body;
    } else {
      return jsonRes(res, {
        code: 404,
        error: `App ${appName} not found`
      });
    }

    if (!app?.spec?.template?.spec) {
      return jsonRes(res, {
        code: 400,
        error: `App ${appName} has invalid structure`
      });
    }

    const containerPorts = remainingNetworks.map((network: any) => ({
      containerPort: network.port,
      name: network.portName,
      protocol: network.protocol
    }));

    await updateAppPorts(app, appName, k8s.k8sApp, k8s.namespace, containerPorts, 'DELETE');

    const appEditData: AppEditType = {
      ...currentAppData,
      networks: remainingNetworks
    };

    await updateServiceAndIngress(appEditData, applyYamlList);

    const response = await getAppByName(appName, k8s);
    const filteredData = await processAppResponse(response);

    return jsonRes(res, {
      data: filteredData
    });
  } catch (error: any) {
    return jsonRes(res, {
      code: 500,
      error: error.message || 'Failed to delete ports'
    });
  }
}
