import { NextRequest, NextResponse } from 'next/server';
import { PatchUtils } from '@kubernetes/client-node';
import { V1Ingress, V1Service } from '@kubernetes/client-node';

import { authSession } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
import { jsonRes } from '@/services/backend/response';
import { devboxKey, ingressProtocolKey, publicDomainKey } from '@/constants/devbox';
import { json2Service, json2Ingress } from '@/utils/json2Yaml';
import { ProtocolType } from '@/types/devbox';
import { KBDevboxTypeV2 } from '@/types/k8s';
import { devboxDB } from '@/services/db/init';
import { calculateUptime, parseTemplateConfig, cpuFormatToM, memoryFormatToMi } from '@/utils/tools';
import { UpdateDevboxRequestSchema, DeleteDevboxRequestSchema, nanoid } from './schema';

//need really realtime use force-dynamic
export const dynamic = 'force-dynamic';

const normalizeProtocol = (protocol?: string): ProtocolType => {
  const normalized = (protocol || 'HTTP').toString().toLowerCase();
  switch (normalized) {
    case 'grpc':
      return 'GRPC';
    case 'ws':
      return 'WS';
    case 'http':
    default:
      return 'HTTP';
  }
};

//19-34 PortError
class PortError extends Error {
  constructor(message: string, public code: number = 500, public details?: any) {
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

//check-devbox-status
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

//convert-to-k8s-resource (partial)
function convertToK8sResourceFormat(resource: { cpu?: number; memory?: number }) {
  const result: any = {};
  if (typeof resource.cpu === 'number') {
    result.cpu = resource.cpu < 1 ? `${resource.cpu * 1000}m` : `${resource.cpu}`;
  }
  if (typeof resource.memory === 'number') {
    result.memory = `${resource.memory}Gi`;
  }
  return result;
}

//get-existing-ports
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
      namespace, undefined, undefined, undefined, undefined, label
    );
    const existingIngresses = ingressesResponse.body.items || [];

    for (const port of service.spec?.ports || []) {
      const portNumber = port.port;
      const portName = port.name;

      const correspondingIngress = existingIngresses.find((ingress: V1Ingress) => {
        const ingressPort = ingress.spec?.rules?.[0]?.http?.paths?.[0]?.backend?.service?.port?.number;
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
        protocol = normalizeProtocol(correspondingIngress.metadata?.annotations?.[ingressProtocolKey]);

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
    if (error.response?.statusCode !== 404) {
      throw new PortError(`Failed to fetch existing ports: ${error.message}`, 500, error);
    }
  }

  return existingPorts;
}

//create-new-port
async function createNewPort(
  portConfig: any,
  devboxName: string,
  namespace: string,
  k8sCore: any,
  k8sNetworkingApp: any,
  applyYamlList: any
) {
  const { INGRESS_SECRET, INGRESS_DOMAIN } = process.env;

  const {
    number: port,
    protocol = 'HTTP',
    exposesPublicDomain = true,
    customDomain
  } = portConfig;
  const normalizedProtocol = normalizeProtocol(protocol);

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

    const networkConfig = {
      name: devboxName,
      networks: [
        {
          networkName,
          portName,
          port,
          protocol: normalizedProtocol,
          openPublicDomain: exposesPublicDomain,
          publicDomain: generatedPublicDomain,
          customDomain: customDomain || ''
        }
      ]
    };

    if (existingService) {
      const existingServicePorts = existingService.spec?.ports || [];

      const portExistsInService = existingServicePorts.some((p: any) => p.port === port);
      if (portExistsInService) {
        throw new PortConflictError(`Port ${port} already exists in service`, {
          portNumber: port,
          conflictingPorts: existingServicePorts.filter((p: any) => p.port === port).map((p: any) => p.name)
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
      await applyYamlList([json2Service(networkConfig)], 'create');
    }

    // Create ingress if public domain is enabled
    if (exposesPublicDomain && INGRESS_SECRET) {
      await applyYamlList([json2Ingress(networkConfig, INGRESS_SECRET)], 'create');
    }

    return {
      portName,
      number: port,
      protocol: normalizedProtocol,
      networkName,
      exposesPublicDomain,
      publicDomain: exposesPublicDomain ? generatedPublicDomain : '',
      customDomain: customDomain || '',
      serviceName: devboxName,
      privateAddress: `http://${devboxName}.${namespace}:${port}`
    };
  } catch (error: any) {
    if (error instanceof PortError) {
      throw error;
    }
    throw new PortError(`Failed to create port ${port}: ${error.message}`, 500, error);
  }
}

//update-existing-port
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

  const existingPort = existingPorts.find(p => p.portName === portName);
  if (!existingPort) {
    throw new PortNotFoundError(
      `Port with name '${portName}' not found`,
      {
        requestedPortName: portName,
        availablePortNames: existingPorts.map(p => p.portName)
      }
    );
  }

  // Check for port number conflicts
  if (updateFields.number && updateFields.number !== existingPort.number) {
    const conflictingPort = existingPorts.find(p =>
      p.number === updateFields.number && p.portName !== portName
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

  const normalizedProtocol = updateFields.protocol ? normalizeProtocol(updateFields.protocol) : undefined;
  const updatedPort = {
    ...existingPort,
    ...updateFields,
    ...(normalizedProtocol ? { protocol: normalizedProtocol } : {})
  };

  try {
    // Update service port number if changed
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

    // Check if ingress needs to be rebuilt
    const needsIngressRebuild =
      updateFields.hasOwnProperty('exposesPublicDomain') ||
      updateFields.customDomain !== undefined ||
      (updateFields.protocol && updateFields.protocol !== existingPort.protocol);

    if (needsIngressRebuild) {
      const { INGRESS_SECRET, INGRESS_DOMAIN } = process.env;

      // Delete existing ingress if it exists
      if (existingPort.networkName) {
        try {
          await k8sNetworkingApp.deleteNamespacedIngress(existingPort.networkName, namespace);
        } catch (error: any) {
          // Ignore 404 errors
        }
      }

      // Create new ingress if public domain is enabled and secret exists
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
              protocol: normalizeProtocol(updatedPort.protocol),
              openPublicDomain: true,
              publicDomain: generatedPublicDomain,
              customDomain: updatedPort.customDomain || ''
            }
          ]
        };

        await applyYamlList([json2Ingress(networkConfig, INGRESS_SECRET)], 'create');

        updatedPort.networkName = newNetworkName;
        updatedPort.publicDomain = generatedPublicDomain;
      } else {
        updatedPort.networkName = '';
        updatedPort.publicDomain = '';
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

//delete-port
async function deletePort(
  portName: string,
  devboxName: string,
  namespace: string,
  k8sCore: any,
  k8sNetworkingApp: any,
  existingPorts: any[]
) {
  const portToDelete = existingPorts.find(p => p.portName === portName);
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
        // Ignore 404 errors
      }
    }

  } catch (error: any) {
    throw new PortError(`Failed to delete port '${portName}': ${error.message}`, 500, error);
  }
}

async function updateDevboxResource(
  devboxName: string,
  quota: { cpu?: number; memory?: number },
  k8sCustomObjects: any,
  namespace: string
) {
  // Check if devbox exists
  try {
    await k8sCustomObjects.getNamespacedCustomObject(
      'devbox.sealos.io',
      'v1alpha2',
      namespace,
      'devboxes',
      devboxName
    );
  } catch (error: any) {
    if (error.statusCode === 404) {
      throw new Error('Devbox not found');
    }
    throw error;
  }

  const k8sResource = convertToK8sResourceFormat(quota);

  await k8sCustomObjects.patchNamespacedCustomObject(
    'devbox.sealos.io',
    'v1alpha2',
    namespace,
    'devboxes',
    devboxName,
    {
      spec: {
        resource: k8sResource
      }
    },
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
    quota: {
      ...(typeof quota.cpu === 'number' ? { cpu: quota.cpu } : {}),
      ...(typeof quota.memory === 'number' ? { memory: quota.memory } : {})
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

  // Delete ports not in the request
  const portsToDelete = existingPorts.filter(
    existingPort => !requestPortNames.has(existingPort.portName)
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

export async function GET(req: NextRequest, { params }: { params: { name: string } }) {
  try {
    const { name: devboxName } = params;
    
    if (!devboxName) {
      return NextResponse.json(
        { error: 'Devbox name is required' },
        { status: 400 }
      );
    }

    const { k8sCustomObjects, namespace, k8sCore, k8sNetworkingApp } = await getK8s({
      kubeconfig: await authSession(req.headers)
    });

    // Get devbox resource from Kubernetes
    const { body: devboxBody } = (await k8sCustomObjects.getNamespacedCustomObject(
      'devbox.sealos.io',
      'v1alpha2',
      namespace,
      'devboxes',
      devboxName
    )) as { body: KBDevboxTypeV2 };

    // Get template information from database
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
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 500 }
      );
    }

    const label = `${devboxKey}=${devboxName}`;
    const podLabel = `app.kubernetes.io/name=${devboxName}`;
    const { SEALOS_DOMAIN } = process.env;

    // Get ingresses, service, secret, and pods
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

    // Parse template config
    const config = parseTemplateConfig(template.config);

    // Build SSH information
    const sshPort = devboxBody.status?.network?.nodePort || 0;
    const base64PrivateKey = secret?.data?.['SEALOS_DEVBOX_PRIVATE_KEY'] as string | undefined;
    
    const ssh = {
      host: SEALOS_DOMAIN || '',
      port: sshPort,
      user: config.user,
      workingDir: config.workingDir,
      ...(base64PrivateKey && { privateKey: base64PrivateKey })
    };

    const quota = {
      cpu: cpuFormatToM(devboxBody.spec.resource.cpu) / 1000,
      memory: memoryFormatToMi(devboxBody.spec.resource.memory) / 1024
    };

    const specConfig = devboxBody.spec.config as any;
    const env = specConfig?.env || [];

    const createdAt = devboxBody.metadata?.creationTimestamp || '';
    const earliestPodCreateTime = (() => {
      const times = pods
        .map((pod: any) => pod?.metadata?.creationTimestamp)
        .filter(Boolean)
        .map((ts: string) => new Date(ts))
        .filter((d: Date) => !Number.isNaN(d.getTime()))
        .sort((a: Date, b: Date) => a.getTime() - b.getTime());
      return times[0];
    })();
    const upTime = earliestPodCreateTime ? calculateUptime(earliestPodCreateTime) : undefined;

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

    const ports = service?.spec?.ports?.map((svcport: any) => {
      const ingressInfo = ingressList.find((ingress) => ingress.port === svcport.port);
      const portNumber = svcport.port;
      const protocol = (ingressInfo?.protocol || 'HTTP').toLowerCase();
      const privateHost = `${devboxName}.${namespace}`;
      const publicScheme = protocol === 'grpc'
        ? 'grpcs'
        : protocol === 'ws'
          ? 'wss'
          : 'https';
      
      return {
        number: portNumber,
        portName: svcport.name,
        protocol,
        privateAddress: `http://${privateHost}:${portNumber}`,
        ...(ingressInfo?.publicDomain && { 
          publicAddress: `${publicScheme}://${ingressInfo.publicDomain}`
        }),
        ...(ingressInfo?.customDomain && { customDomain: ingressInfo.customDomain })
      };
    }) || [];

    const podsData = pods.map((pod: any) => ({
      name: pod.metadata?.name || '',
      status: (pod.status?.phase || 'Unknown').toLowerCase()
    }));

    const data = {
      name: devboxBody.metadata.name || devboxName,
      createdAt,
      upTime,
      uid: devboxBody.metadata?.uid || '',
      resourceType: 'devbox',
      runtime: template.templateRepository.iconId || '',
      image: template.image,
      status: (devboxBody.status?.phase || 'Pending').toLowerCase(),
      quota,
      ssh,
      env,
      ports,
      pods: podsData,
      operationalStatus: devboxBody.status
    };

    return NextResponse.json(data);
  } catch (err: any) {
    console.error('Get devbox detail error:', err);

    if (err.statusCode === 404 || err.response?.statusCode === 404) {
      return NextResponse.json(
        { error: 'Devbox not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { 
        error: err?.message || 'Internal server error occurred while retrieving devbox details',
        ...(process.env.NODE_ENV === 'development' && { details: err })
      },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { name: string } }) {
  try {
    const { name: devboxName } = params;
    
    if (!devboxName) {
      return new NextResponse(null, { status: 400 });
    }

    const body = await req.json();
    const validationResult = UpdateDevboxRequestSchema.safeParse(body);

    if (!validationResult.success) {
      return new NextResponse(null, { status: 400 });
    }

    const { quota, ports } = validationResult.data;

    const { applyYamlList, k8sCore, k8sNetworkingApp, k8sCustomObjects, namespace } = await getK8s({
      kubeconfig: await authSession(req.headers)
    });

    let resourceResult = null;
    let portsResult = null;

    // Update resource if provided
    if (quota) {
      try {
        resourceResult = await updateDevboxResource(
          devboxName,
          quota,
          k8sCustomObjects,
          namespace
        );
      } catch (error: any) {
        if (error.message === 'Devbox not found') {
          return new NextResponse(null, { status: 404 });
        }

        if (error.statusCode === 422 || error.statusCode === 400) {
          return new NextResponse(null, { status: error.statusCode });
        }

        throw error;
      }
    }

    // Update ports if provided
    if (ports) {
      try {
        // Map isPublic -> exposesPublicDomain for internal logic
        const mappedPorts = ports.map((p: any) => (
          p && Object.prototype.hasOwnProperty.call(p, 'isPublic')
            ? { ...p, exposesPublicDomain: p.isPublic }
            : p
        ));

        portsResult = await updateDevboxPorts(
          devboxName,
          mappedPorts,
          k8sCore,
          k8sNetworkingApp,
          applyYamlList,
          namespace
        );
      } catch (error: any) {
        console.error('Ports update failed:', error);

        if (error instanceof PortConflictError) {
          return new NextResponse(null, { status: error.code });
        }

        if (error instanceof PortNotFoundError) {
          return new NextResponse(null, { status: error.code });
        }

        if (error instanceof PortError) {
          return new NextResponse(null, { status: error.code });
        }

        throw error;
      }
    }

    const responseData: any = {};

    if (resourceResult) {
      responseData.quota = resourceResult;
    }

    if (portsResult) {
      responseData.ports = portsResult.map((p: any) => ({
        ...p,
        isPublic: p.exposesPublicDomain,
        exposesPublicDomain: undefined
      }));
    }

    return new NextResponse(null, { status: 204 });

  } catch (err: any) {
    console.error('Devbox update error:', err);

    return new NextResponse(null, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { name: string } }) {
  try {
    const { name: devboxName } = params;

    if (!devboxName) {
      return jsonRes({
        code: 400,
        message: 'Devbox name is required'
      });
    }

    const validationResult = DeleteDevboxRequestSchema.safeParse({ devboxName });

    if (!validationResult.success) {
      return jsonRes({
        code: 400,
        message: 'Invalid request parameters',
        error: validationResult.error.errors
      });
    }

    const headerList = req.headers;

    const { k8sCustomObjects, k8sCore, namespace } = await getK8s({
      kubeconfig: await authSession(headerList)
    });

    await k8sCustomObjects.deleteNamespacedCustomObject(
      'devbox.sealos.io',
      'v1alpha2',
      namespace,
      'devboxes',
      devboxName
    );

    const ingressResponse = (await k8sCustomObjects.listNamespacedCustomObject(
      'networking.k8s.io',
      'v1',
      namespace,
      'ingresses',
      undefined,
      undefined,
      undefined,
      undefined,
      `${devboxKey}=${devboxName}`
    )) as {
      body: {
        items: any[];
      };
    };

    const ingressList = ingressResponse.body.items;

    // delete service and ingress at the same time
    if (ingressList.length > 0) {
      const deleteServicePromise = k8sCore.deleteNamespacedService(devboxName, namespace);

      const deletePromises = ingressList.map(async (ingress: any) => {
        const networkName = ingress.metadata.name;

        const safeDelete = async (group: string, version: string, plural: string, name: string) => {
          try {
            await k8sCustomObjects.deleteNamespacedCustomObject(
              group,
              version,
              namespace,
              plural,
              name
            );
          } catch (err) {
            console.warn('Failed to delete an item, ignoring:', plural, name, err);
          }
        };

        return Promise.all([
          safeDelete('networking.k8s.io', 'v1', 'ingresses', networkName),
          // this two muse have customDomain
          safeDelete('cert-manager.io', 'v1', 'issuers', networkName),
          safeDelete('cert-manager.io', 'v1', 'certificates', networkName)
        ]);
      });

      await Promise.all([deleteServicePromise, ...deletePromises]);
    }

    // Success: return 204 No Content
    return new NextResponse(null, { status: 204 });
  } catch (err: any) {
    return jsonRes({
      code: 500,
      message: err?.message || 'Internal server error',
      error: err
    });
  }
}
