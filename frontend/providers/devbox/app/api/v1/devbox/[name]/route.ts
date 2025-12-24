import { NextRequest } from 'next/server';
import { PatchUtils } from '@kubernetes/client-node';
import { V1Ingress, V1Service } from '@kubernetes/client-node';

import { authSession } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
import { jsonRes } from '@/services/backend/response';
import { devboxKey, ingressProtocolKey, publicDomainKey } from '@/constants/devbox';
import { json2Service, json2Ingress } from '@/utils/json2Yaml';
import { ProtocolType } from '@/types/devbox';
import { KBDevboxTypeV2 } from '@/types/k8s';
import { UpdateDevboxRequestSchema, nanoid } from './schema';
import { devboxDB } from '@/services/db/init';
import { cpuFormatToM, memoryFormatToMi, parseTemplateConfig } from '@/utils/tools';

export const dynamic = 'force-dynamic';

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

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForDevboxStatus(
  k8sCustomObjects: any,
  namespace: string,
  devboxName: string,
  maxRetries = 10,
  interval = 1000
): Promise<KBDevboxTypeV2> {
  let retries = 0;
  while (retries < maxRetries) {
    const { body: devboxBody } = (await k8sCustomObjects.getNamespacedCustomObject(
      'devbox.sealos.io',
      'v1alpha2',
      namespace,
      'devboxes',
      devboxName
    )) as { body: KBDevboxTypeV2 };
    if (devboxBody.status) {
      return devboxBody;
    }
    await sleep(interval);
    retries++;
  }
  throw new Error('Timeout waiting for devbox status');
}

function convertToK8sResourceFormat(resource: { cpu: number; memory: number }) {
  const cpuValue = resource.cpu;
  const memoryValue = resource.memory;

  const cpuFormat = cpuValue < 1 ? `${cpuValue * 1000}m` : `${cpuValue}`;

  const memoryFormat = `${memoryValue}Gi`;

  return {
    cpu: cpuFormat,
    memory: memoryFormat
  };
}

async function getExistingPorts(
  k8sCore: any,
  k8sNetworkingApp: any,
  devboxName: string,
  namespace: string
) {
  const existingPorts = [];

  try {
    const serviceResponse = await k8sCore.readNamespacedService(devboxName, namespace);
    const service = serviceResponse.body;

    const label = `${devboxKey}=${devboxName}`;
    const ingressesResponse = await k8sNetworkingApp.listNamespacedIngress(
      namespace,
      undefined,
      undefined,
      undefined,
      undefined,
      label
    );
    const existingIngresses = ingressesResponse.body.items || [];

    for (const port of service.spec?.ports || []) {
      const portNumber = port.port;
      const portName = port.name;

      const correspondingIngress = existingIngresses.find((ingress: V1Ingress) => {
        const ingressPort =
          ingress.spec?.rules?.[0]?.http?.paths?.[0]?.backend?.service?.port?.number;
        return ingressPort === portNumber;
      });

      let publicDomain = '';
      let customDomain = '';
      let networkName = '';
      let exposesPublicDomain = false;
      let protocol = 'HTTP';

      if (correspondingIngress) {
        networkName = correspondingIngress.metadata?.name || '';
        const defaultDomain = correspondingIngress.metadata?.labels?.[publicDomainKey];
        const tlsHost = correspondingIngress.spec?.tls?.[0]?.hosts?.[0];
        protocol = correspondingIngress.metadata?.annotations?.[ingressProtocolKey] || 'HTTP';

        exposesPublicDomain = !!defaultDomain;
        publicDomain = defaultDomain === tlsHost ? tlsHost : defaultDomain || '';
        customDomain = defaultDomain === tlsHost ? '' : tlsHost || '';
      }

      existingPorts.push({
        portName,
        number: portNumber,
        protocol,
        networkName,
        exposesPublicDomain,
        publicDomain,
        customDomain,
        serviceName: service.metadata?.name,
        privateAddress: `http://${service.metadata?.name}.${namespace}:${portNumber}`
      });
    }
  } catch (error: any) {
    if (error.response?.statusCode === 404) {
    } else {
      throw new PortError(`Failed to fetch existing ports: ${error.message}`, 500, error);
    }
  }

  return existingPorts;
}

async function createNewPort(
  portConfig: any,
  devboxName: string,
  namespace: string,
  k8sCore: any,
  k8sNetworkingApp: any,
  applyYamlList: any
) {
  const { INGRESS_SECRET, INGRESS_DOMAIN } = process.env;

  const { number: port, protocol = 'HTTP', exposesPublicDomain = true, customDomain } = portConfig;

  const networkName = `${devboxName}-${nanoid()}`;
  const generatedPublicDomain = `${nanoid()}.${INGRESS_DOMAIN}`;
  const portName = `port-${nanoid()}`;

  try {
    let existingService: V1Service | null = null;
    try {
      const serviceResponse = await k8sCore.readNamespacedService(devboxName, namespace);
      existingService = serviceResponse.body;
    } catch (error: any) {
      if (error.response?.statusCode !== 404) {
        throw new PortError(`Failed to check existing service: ${error.message}`, 500, error);
      }
    }

    if (existingService) {
      const existingServicePorts = existingService.spec?.ports || [];

      const portExistsInService = existingServicePorts.some((p: any) => p.port === port);
      if (portExistsInService) {
        throw new PortConflictError(`Port ${port} already exists in service`, {
          portNumber: port,
          conflictingPorts: existingServicePorts
            .filter((p: any) => p.port === port)
            .map((p: any) => p.name)
        });
      }

      const updatedPorts = [
        ...existingServicePorts,
        {
          port: port,
          targetPort: port,
          name: portName
        }
      ];

      await k8sCore.patchNamespacedService(
        devboxName,
        namespace,
        {
          spec: {
            ports: updatedPorts
          }
        },
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        { headers: { 'Content-type': PatchUtils.PATCH_FORMAT_JSON_MERGE_PATCH } }
      );
    } else {
      const networkConfig = {
        name: devboxName,
        networks: [
          {
            networkName,
            portName,
            port,
            protocol: protocol as ProtocolType,
            openPublicDomain: exposesPublicDomain,
            publicDomain: generatedPublicDomain,
            customDomain: customDomain || ''
          }
        ]
      };
      await applyYamlList([json2Service(networkConfig)], 'create');
    }

    if (exposesPublicDomain && INGRESS_SECRET) {
      const networkConfig = {
        name: devboxName,
        networks: [
          {
            networkName,
            portName,
            port,
            protocol: protocol as ProtocolType,
            openPublicDomain: exposesPublicDomain,
            publicDomain: generatedPublicDomain,
            customDomain: customDomain || ''
          }
        ]
      };
      const ingressYaml = json2Ingress(networkConfig, INGRESS_SECRET);
      await applyYamlList([ingressYaml], 'create');
    }

    const result = {
      portName,
      number: port,
      protocol,
      networkName,
      exposesPublicDomain,
      publicDomain: exposesPublicDomain ? generatedPublicDomain : '',
      customDomain: customDomain || '',
      serviceName: devboxName,
      privateAddress: `http://${devboxName}.${namespace}:${port}`
    };

    return result;
  } catch (error: any) {
    if (error instanceof PortError) {
      throw error;
    }
    throw new PortError(`Failed to create port ${port}: ${error.message}`, 500, error);
  }
}

async function updateExistingPort(
  portConfig: any,
  devboxName: string,
  namespace: string,
  k8sCore: any,
  k8sNetworkingApp: any,
  applyYamlList: any,
  existingPorts: any[]
) {
  const { portName, ...updateFields } = portConfig;

  const existingPort = existingPorts.find((p) => p.portName === portName);
  if (!existingPort) {
    throw new PortNotFoundError(`Port with name '${portName}' not found`, {
      requestedPortName: portName,
      availablePortNames: existingPorts.map((p) => p.portName)
    });
  }

  if (updateFields.number && updateFields.number !== existingPort.number) {
    const conflictingPort = existingPorts.find(
      (p) => p.number === updateFields.number && p.portName !== portName
    );
    if (conflictingPort) {
      throw new PortConflictError(
        `Port ${updateFields.number} is already in use by port '${conflictingPort.portName}'`,
        {
          conflictingPortName: conflictingPort.portName,
          portNumber: updateFields.number
        }
      );
    }
  }

  const updatedPort = { ...existingPort, ...updateFields };

  try {
    if (updateFields.number && updateFields.number !== existingPort.number) {
      const serviceResponse = await k8sCore.readNamespacedService(devboxName, namespace);
      const existingService = serviceResponse.body;
      const updatedPorts = existingService.spec.ports.map((p: any) =>
        p.name === portName
          ? { ...p, port: updateFields.number, targetPort: updateFields.number }
          : p
      );

      await k8sCore.patchNamespacedService(
        devboxName,
        namespace,
        {
          spec: {
            ports: updatedPorts
          }
        },
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        { headers: { 'Content-type': PatchUtils.PATCH_FORMAT_JSON_MERGE_PATCH } }
      );

      updatedPort.privateAddress = `http://${devboxName}.${namespace}:${updateFields.number}`;
    }

    if (
      updateFields.hasOwnProperty('exposesPublicDomain') ||
      updateFields.customDomain !== undefined
    ) {
      const { INGRESS_SECRET, INGRESS_DOMAIN } = process.env;

      if (existingPort.networkName) {
        try {
          await k8sNetworkingApp.deleteNamespacedIngress(existingPort.networkName, namespace);
        } catch (error: any) {
          if (error.response?.statusCode !== 404) {
          }
        }
      }

      if (updatedPort.exposesPublicDomain && INGRESS_SECRET) {
        const generatedPublicDomain = `${nanoid()}.${INGRESS_DOMAIN}`;
        const newNetworkName = `${devboxName}-${nanoid()}`;

        const networkConfig = {
          name: devboxName,
          networks: [
            {
              networkName: newNetworkName,
              portName: updatedPort.portName,
              port: updatedPort.number,
              protocol: updatedPort.protocol as ProtocolType,
              openPublicDomain: true,
              publicDomain: generatedPublicDomain,
              customDomain: updatedPort.customDomain || ''
            }
          ]
        };

        const ingressYaml = json2Ingress(networkConfig, INGRESS_SECRET);
        await applyYamlList([ingressYaml], 'create');

        updatedPort.networkName = newNetworkName;
        updatedPort.publicDomain = generatedPublicDomain;
      } else {
        updatedPort.networkName = '';
        updatedPort.publicDomain = '';
      }
    }

    if (
      updateFields.protocol &&
      updateFields.protocol !== existingPort.protocol &&
      existingPort.networkName
    ) {
      const { INGRESS_SECRET, INGRESS_DOMAIN } = process.env;

      if (INGRESS_SECRET) {
        try {
          await k8sNetworkingApp.deleteNamespacedIngress(existingPort.networkName, namespace);
        } catch (error: any) {
          if (error.response?.statusCode !== 404) {
          }
        }

        const networkConfig = {
          name: devboxName,
          networks: [
            {
              networkName: existingPort.networkName,
              portName: updatedPort.portName,
              port: updatedPort.number,
              protocol: updateFields.protocol as ProtocolType,
              openPublicDomain: updatedPort.exposesPublicDomain,
              publicDomain: updatedPort.publicDomain,
              customDomain: updatedPort.customDomain || ''
            }
          ]
        };

        const ingressYaml = json2Ingress(networkConfig, INGRESS_SECRET);
        await applyYamlList([ingressYaml], 'create');
      }
    }

    return updatedPort;
  } catch (error: any) {
    if (error instanceof PortError) {
      throw error;
    }
    throw new PortError(`Failed to update port '${portName}': ${error.message}`, 500, error);
  }
}

async function deletePort(
  portName: string,
  devboxName: string,
  namespace: string,
  k8sCore: any,
  k8sNetworkingApp: any,
  existingPorts: any[]
) {
  const portToDelete = existingPorts.find((p) => p.portName === portName);
  if (!portToDelete) {
    return;
  }

  try {
    const serviceResponse = await k8sCore.readNamespacedService(devboxName, namespace);
    const existingService = serviceResponse.body;
    const updatedPorts = existingService.spec.ports.filter((p: any) => p.name !== portName);

    if (updatedPorts.length === 0) {
      await k8sCore.deleteNamespacedService(devboxName, namespace);
    } else {
      await k8sCore.patchNamespacedService(
        devboxName,
        namespace,
        {
          spec: {
            ports: updatedPorts
          }
        },
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        { headers: { 'Content-type': PatchUtils.PATCH_FORMAT_JSON_MERGE_PATCH } }
      );
    }

    if (portToDelete.networkName) {
      try {
        await k8sNetworkingApp.deleteNamespacedIngress(portToDelete.networkName, namespace);
      } catch (error: any) {
        if (error.response?.statusCode !== 404) {
        }
      }
    }
  } catch (error: any) {
    throw new PortError(`Failed to delete port '${portName}': ${error.message}`, 500, error);
  }
}

async function updateDevboxResource(
  devboxName: string,
  resource: { cpu: number; memory: number },
  k8sCustomObjects: any,
  namespace: string
) {
  let existingDevbox: KBDevboxTypeV2;
  try {
    const { body: devboxBody } = (await k8sCustomObjects.getNamespacedCustomObject(
      'devbox.sealos.io',
      'v1alpha2',
      namespace,
      'devboxes',
      devboxName
    )) as { body: KBDevboxTypeV2 };
    existingDevbox = devboxBody;
  } catch (error: any) {
    if (error.statusCode === 404) {
      throw new Error('Devbox not found');
    }
    throw error;
  }

  const k8sResource = convertToK8sResourceFormat(resource);

  const patchData = {
    spec: {
      resource: k8sResource
    }
  };

  console.log('Patching devbox with resource:', k8sResource);

  await k8sCustomObjects.patchNamespacedCustomObject(
    'devbox.sealos.io',
    'v1alpha2',
    namespace,
    'devboxes',
    devboxName,
    patchData,
    undefined,
    undefined,
    undefined,
    {
      headers: {
        'Content-Type': PatchUtils.PATCH_FORMAT_JSON_MERGE_PATCH
      }
    }
  );

  const updatedDevbox = await waitForDevboxStatus(
    k8sCustomObjects,
    namespace,
    devboxName,
    15,
    2000
  );

  return {
    name: devboxName,
    resource: {
      cpu: resource.cpu,
      memory: resource.memory
    },
    k8sResource: k8sResource,
    status: updatedDevbox.status?.phase || 'Unknown',
    updatedAt: new Date().toISOString()
  };
}

async function updateDevboxPorts(
  devboxName: string,
  requestPorts: any[],
  k8sCore: any,
  k8sNetworkingApp: any,
  applyYamlList: any,
  namespace: string
) {
  const existingPorts = await getExistingPorts(k8sCore, k8sNetworkingApp, devboxName, namespace);

  const resultPorts = [];
  const requestPortNames = new Set<string>();

  for (const portConfig of requestPorts) {
    try {
      if ('portName' in portConfig && portConfig.portName) {
        requestPortNames.add(portConfig.portName);
        const updatedPort = await updateExistingPort(
          portConfig,
          devboxName,
          namespace,
          k8sCore,
          k8sNetworkingApp,
          applyYamlList,
          existingPorts
        );
        resultPorts.push(updatedPort);
      } else {
        const createdPort = await createNewPort(
          portConfig,
          devboxName,
          namespace,
          k8sCore,
          k8sNetworkingApp,
          applyYamlList
        );
        resultPorts.push(createdPort);
      }
    } catch (error: any) {
      if (error instanceof PortError) {
        throw error;
      }
      throw new PortError(`Failed to process port configuration: ${error.message}`, 500, error);
    }
  }

  const portsToDelete = existingPorts.filter(
    (existingPort) => !requestPortNames.has(existingPort.portName)
  );

  for (const portToDelete of portsToDelete) {
    await deletePort(
      portToDelete.portName,
      devboxName,
      namespace,
      k8sCore,
      k8sNetworkingApp,
      existingPorts
    );
  }

  return resultPorts;
}

export async function PATCH(req: NextRequest, { params }: { params: { name: string } }) {
  try {
    const { name: devboxName } = params;

    if (!devboxName) {
      return jsonRes({
        code: 400,
        message: 'Devbox name is required'
      });
    }

    const body = await req.json();
    const validationResult = UpdateDevboxRequestSchema.safeParse(body);

    if (!validationResult.success) {
      return jsonRes({
        code: 400,
        message: 'Invalid request parameters',
        error: {
          details: validationResult.error.errors,
          message: 'Request validation failed. Please check your configurations.'
        }
      });
    }

    const { resource, ports } = validationResult.data;
    const headerList = req.headers;

    const { applyYamlList, k8sCore, k8sNetworkingApp, k8sCustomObjects, namespace } = await getK8s({
      kubeconfig: await authSession(headerList)
    });

    let resourceResult = null;
    let portsResult = null;

    // Update resource if provided
    if (resource) {
      try {
        resourceResult = await updateDevboxResource(
          devboxName,
          resource,
          k8sCustomObjects,
          namespace
        );
      } catch (error: any) {
        if (error.message === 'Devbox not found') {
          return jsonRes({
            code: 404,
            message: 'Devbox not found'
          });
        }

        if (error.statusCode === 422) {
          return jsonRes({
            code: 422,
            message: 'Invalid resource configuration',
            error: error.body || error.message
          });
        }

        if (error.statusCode === 400) {
          return jsonRes({
            code: 400,
            message: 'Bad request - invalid resource values',
            error: error.body || error.message
          });
        }

        throw error;
      }
    }

    // Update ports if provided
    if (ports) {
      try {
        portsResult = await updateDevboxPorts(
          devboxName,
          ports,
          k8sCore,
          k8sNetworkingApp,
          applyYamlList,
          namespace
        );
        console.log('Ports update completed successfully');
      } catch (error: any) {
        console.error('Ports update failed:', error);

        if (error instanceof PortConflictError) {
          return jsonRes({
            code: error.code,
            message: error.message,
            error: {
              type: 'PORT_CONFLICT',
              details: error.details,
              suggestion: 'Please choose a different port number that is not already in use.'
            }
          });
        }

        if (error instanceof PortNotFoundError) {
          return jsonRes({
            code: error.code,
            message: error.message,
            error: {
              type: 'PORT_NOT_FOUND',
              details: error.details,
              suggestion:
                'Please check the port name and ensure it exists before attempting to update.'
            }
          });
        }

        if (error instanceof PortError) {
          return jsonRes({
            code: error.code,
            message: error.message,
            error: {
              type: 'PORT_OPERATION_FAILED',
              details: error.details
            }
          });
        }

        throw error;
      }
    }

    const responseData: any = {};

    if (resourceResult) {
      responseData.resource = resourceResult;
    }

    if (portsResult) {
      responseData.ports = portsResult;
    }

    return jsonRes({
      data: responseData
    });
  } catch (err: any) {
    console.error('Devbox update error:', err);

    return jsonRes({
      code: 500,
      message: err?.message || 'Internal server error occurred during devbox update',
      error: {
        type: 'INTERNAL_ERROR',
        details: process.env.NODE_ENV === 'development' ? err : undefined,
        suggestion: 'Please try again. If the problem persists, contact support.'
      }
    });
  }
}

export async function GET(req: NextRequest, { params }: { params: { name: string } }) {
  try {
    const { name: devboxName } = params;

    if (!devboxName) {
      return jsonRes({
        code: 400,
        message: 'Devbox name is required'
      });
    }

    const { k8sCustomObjects, namespace, k8sCore, k8sNetworkingApp } = await getK8s({
      kubeconfig: await authSession(req.headers)
    });

    const { body: devboxBody } = (await k8sCustomObjects.getNamespacedCustomObject(
      'devbox.sealos.io',
      'v1alpha2',
      namespace,
      'devboxes',
      devboxName
    )) as { body: KBDevboxTypeV2 };

    const template = await devboxDB.template.findUnique({
      where: {
        uid: devboxBody.spec.templateID
      },
      select: {
        templateRepository: {
          select: {
            uid: true,
            iconId: true,
            name: true,
            kind: true,
            description: true
          }
        },
        uid: true,
        image: true,
        name: true,
        config: true
      }
    });

    if (!template) {
      return jsonRes({
        code: 500,
        message: 'Template not found'
      });
    }

    const label = `${devboxKey}=${devboxName}`;
    const podLabel = `app.kubernetes.io/name=${devboxName}`;
    const { SEALOS_DOMAIN } = process.env;

    const [ingressesResponse, serviceResponse, secretResponse, podsResponse] = await Promise.all([
      k8sNetworkingApp
        .listNamespacedIngress(namespace, undefined, undefined, undefined, undefined, label)
        .catch(() => null),
      k8sCore.readNamespacedService(devboxName, namespace).catch(() => null),
      k8sCore.readNamespacedSecret(devboxName, namespace).catch(() => null),
      k8sCore.listNamespacedPod(namespace, undefined, undefined, undefined, undefined, podLabel).catch(() => null)
    ]);

    const ingresses = ingressesResponse?.body.items || [];
    const service = serviceResponse?.body;
    const secret = secretResponse?.body;
    const pods = podsResponse?.body.items || [];

    const config = parseTemplateConfig(template.config);

    const sshPort = devboxBody.status?.network?.nodePort || 0;
    const base64PrivateKey = secret?.data?.['SEALOS_DEVBOX_PRIVATE_KEY'] as string | undefined;
    const base64JwtSecret = secret?.data?.['SEALOS_DEVBOX_JWT_SECRET'] as string | undefined;

    const ssh = {
      host: SEALOS_DOMAIN || '',
      port: sshPort,
      user: config.user,
      workingDir: config.workingDir,
      ...(base64PrivateKey && { privateKey: base64PrivateKey })
    };

    const agentServer = {
      url: devboxBody.status?.network?.uniqueID || '',
      token: base64JwtSecret || ''
    };

    const resources = {
      cpu: cpuFormatToM(devboxBody.spec?.resource?.cpu || '0') / 1000,
      memory: memoryFormatToMi(devboxBody.spec?.resource?.memory || '0') / 1024
    };

    const specConfig = (devboxBody.spec?.config as any) || {};
    const env = specConfig?.env || [];

    const ingressList = ingresses.map((item: V1Ingress) => {
      const defaultDomain = item.metadata?.labels?.[publicDomainKey];
      const tlsHost = item.spec?.tls?.[0]?.hosts?.[0];
      return {
        networkName: item.metadata?.name,
        port: item.spec?.rules?.[0]?.http?.paths?.[0]?.backend?.service?.port?.number,
        protocol: item.metadata?.annotations?.[ingressProtocolKey],
        openPublicDomain: !!defaultDomain,
        publicDomain: defaultDomain === tlsHost ? tlsHost : defaultDomain,
        customDomain: defaultDomain === tlsHost ? '' : tlsHost
      };
    });

    const ports = (service?.spec?.ports || []).map((svcPort: any) => {
      const ingressInfo = ingressList.find((ingress) => ingress.port === svcPort.port);
      const portNumber = svcPort.port;
      const protocol = ingressInfo?.protocol || 'HTTP';
      const privateHost = `${devboxName}.${namespace}`;

      const portData: any = {
        number: portNumber,
        portName: svcPort.name,
        protocol,
        serviceName: service?.metadata?.name,
        privateAddress: `http://${privateHost}:${portNumber}`,
        privateHost
      };

      if (ingressInfo?.networkName) {
        portData.networkName = ingressInfo.networkName;
      }

      if (ingressInfo?.publicDomain) {
        portData.publicHost = ingressInfo.publicDomain;
        portData.publicAddress = `https://${ingressInfo.publicDomain}`;
      }

      if (ingressInfo?.customDomain) {
        portData.customDomain = ingressInfo.customDomain;
      }

      return portData;
    });

    const podsData = pods.map((pod: any) => ({
      name: pod.metadata?.name || '',
      status: pod.status?.phase || 'Unknown'
    }));

    const data = {
      name: devboxBody.metadata?.name || devboxName,
      uid: devboxBody.metadata?.uid || '',
      resourceType: 'devbox' as const,
      runtime: template.templateRepository?.iconId || '',
      image: template.image,
      status: devboxBody.status?.phase || 'Pending',
      resources,
      ssh,
      env,
      ports,
      pods: podsData,
      operationalStatus: devboxBody.status,
      agentServer
    };

    return jsonRes({ data });
  } catch (err: any) {
    console.error('Get devbox detail error:', err);

    if (err.statusCode === 404 || err.response?.statusCode === 404) {
      return jsonRes({
        code: 404,
        message: 'Devbox not found'
      });
    }

    return jsonRes({
      code: 500,
      message: err?.message || 'Internal server error occurred while retrieving devbox details',
      error: {
        type: 'INTERNAL_ERROR',
        details: process.env.NODE_ENV === 'development' ? err : undefined
      }
    });
  }
}
