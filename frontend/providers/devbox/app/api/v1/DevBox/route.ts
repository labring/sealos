import { NextRequest } from 'next/server';
import { PatchUtils } from '@kubernetes/client-node';
import { V1Ingress, V1Service } from '@kubernetes/client-node';

import { authSession } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
import { jsonRes } from '@/services/backend/response';
import { devboxDB } from '@/services/db/init';
import { devboxKey, ingressProtocolKey, publicDomainKey } from '@/constants/devbox';
import { KBDevboxTypeV2 } from '@/types/k8s';
import { json2DevboxV2, json2Service, json2Ingress } from '@/utils/json2Yaml';
import { ProtocolType } from '@/types/devbox';
import { RequestSchema, nanoid } from './schema';
import { getRegionUid } from '@/utils/env';
import { adaptDevboxDetailV2 } from '@/utils/adapt';
import { parseTemplateConfig } from '@/utils/tools';

export const dynamic = 'force-dynamic';

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForDevboxStatus(
  k8sCustomObjects: any,
  namespace: string,
  devboxName: string,
  maxRetries = 10,
  interval = 100
): Promise<KBDevboxTypeV2> {
  let retries = 0;
  while (retries < maxRetries) {
    const { body: devboxBody } = (await k8sCustomObjects.getNamespacedCustomObject(
      'devbox.sealos.io',
      'v1alpha1',
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

function convertResourceConfig(resource: { cpu: number; memory: number }) {
  const cpuInMilliCores = resource.cpu * 1000;
  const memoryInMB = resource.memory * 1024;
  
  return {
    cpu: cpuInMilliCores,
    memory: memoryInMB
  };
}

async function waitForDevboxReady(
  k8sCustomObjects: any,
  k8sCore: any,
  namespace: string,
  devboxName: string,
  maxRetries = 20,
  interval = 100
): Promise<boolean> {
  let retries = 0;
  while (retries < maxRetries) {
    try {
      const { body: devboxBody } = await k8sCustomObjects.getNamespacedCustomObject(
        'devbox.sealos.io',
        'v1alpha1',
        namespace,
        'devboxes',
        devboxName
      ) as { body: KBDevboxTypeV2 };
      
      if (devboxBody.status?.phase === 'Running') {
        try {
          const podsResponse = await k8sCore.listNamespacedPod(
            namespace,
            undefined,
            undefined,
            undefined,
            undefined,
            `${devboxKey}=${devboxName}`
          );
          
          const pods = podsResponse.body.items;
          const readyPod = pods.find((pod: any) => 
            pod.status?.phase === 'Running' && 
            pod.status?.conditions?.some((condition: any) => 
              condition.type === 'Ready' && condition.status === 'True'
            )
          );
          
          if (readyPod) {
            console.log(`DevBox ${devboxName} is ready for port creation`);
            return true;
          }
        } catch (podError) {
          console.log('Pod not ready yet, waiting...');
        }
      }
    } catch (error) {
      console.log(`DevBox ${devboxName} not ready yet, waiting... (${retries + 1}/${maxRetries})`);
    }
    
    await sleep(interval);
    retries++;
  }
  
  console.warn(`DevBox ${devboxName} not fully ready after ${maxRetries} retries, proceeding anyway`);
  return false;
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
        throw new Error(`Failed to check existing service: ${error.message}`);
      }
    }

    if (existingService) {
   
      const existingServicePorts = existingService.spec?.ports || [];
      
             const portExistsInService = existingServicePorts.some((p: any) => p.port === port);
       if (portExistsInService) {
      
         const existingPortInfo = existingServicePorts.find((p: any) => p.port === port);
         if (!existingPortInfo) {
           throw new Error(`Port ${port} found in service but port info is missing`);
         }
         console.log(`Port ${port} already exists in service`);
        
      
        let networkName = '';
        let exposesPublicDomainResult = false;
        let publicDomain = '';
        
        if (exposesPublicDomain && INGRESS_SECRET) {
          const newNetworkName = `${devboxName}-${nanoid()}`;
          console.log(`Creating ingress for existing port ${port} with network name ${newNetworkName}`);
          const networkConfig = {
            name: devboxName,
            networks: [
                             {
                 networkName: newNetworkName,
                 portName: existingPortInfo.name || `port-${port}`,
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
          
          networkName = newNetworkName;
          exposesPublicDomainResult = true;
          publicDomain = generatedPublicDomain;
        }
        
                 return {
           portName: existingPortInfo.name || `port-${port}`,
           number: port,
          protocol,
          networkName,
          exposesPublicDomain: exposesPublicDomainResult,
          publicDomain,
          customDomain: customDomain || '',
          serviceName: devboxName,
          privateAddress: `http://${devboxName}.${namespace}:${port}`
        };
      }
      
    
      const updatedPorts = [
        ...existingServicePorts,
        {
          port: port,
          targetPort: port,
          name: portName
        }
      ];
      
      console.log(`Adding port ${port} to existing service with name ${portName}`);
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
 
      console.log(`Creating new service for port ${port} with name ${portName}`);
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
      console.log(`Creating ingress for port ${port} with network name ${networkName}`);
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
    
    console.log(`Successfully created port:`, result);
    return result;
  } catch (error: any) {
    console.error(`Failed to create port ${port}:`, error);
    throw new Error(`Failed to create port ${port}: ${error.message}`);
  }
}

async function createPortsAndNetworks(
  ports: Array<{ number: number; protocol?: string; exposesPublicDomain?: boolean; customDomain?: string }>,
  devboxName: string,
  namespace: string,
  k8sCore: any,
  k8sNetworkingApp: any,
  applyYamlList: any,
  k8sCustomObjects: any
) {
  if (!ports.length) {
    return [];
  }

  const createdPorts = [];

  console.log('Waiting for DevBox to be ready before creating ports...');
  await waitForDevboxReady(k8sCustomObjects, k8sCore, namespace, devboxName);


  for (const portConfig of ports) {
    try {
      console.log(`Creating port ${portConfig.number}`);
      const createdPort = await createNewPort(
        portConfig,
        devboxName,
        namespace,
        k8sCore,
        k8sNetworkingApp,
        applyYamlList
      );
      createdPorts.push(createdPort);
      console.log(`Successfully created port: ${createdPort.portName}:${createdPort.number}`);
    } catch (error: any) {
      console.error(`Failed to create port ${portConfig.number}:`, error);
   
      createdPorts.push({
        portName: `port-${portConfig.number}-failed`,
        number: portConfig.number,
        protocol: portConfig.protocol || 'HTTP',
        networkName: '',
        exposesPublicDomain: false,
        publicDomain: '',
        customDomain: portConfig.customDomain || '',
        serviceName: devboxName,
        privateAddress: `http://${devboxName}.${namespace}:${portConfig.number}`,
        error: error.message
      });
    }
  }

  return createdPorts;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validationResult = RequestSchema.safeParse(body);

    if (!validationResult.success) {
      return jsonRes({
        code: 400,
        message: 'Invalid request body',
        error: validationResult.error.errors
      });
    }

    const devboxForm = validationResult.data;
    const headerList = req.headers;

    const { applyYamlList, k8sCustomObjects, namespace, k8sCore, k8sNetworkingApp } = await getK8s({
      kubeconfig: await authSession(headerList)
    });

   
    const { body: devboxListBody } = (await k8sCustomObjects.listNamespacedCustomObject(
      'devbox.sealos.io',
      'v1alpha1',
      namespace,
      'devboxes'
    )) as {
      body: {
        items: KBDevboxTypeV2[];
      };
    };

    if (
      !!devboxListBody &&
      devboxListBody.items.length > 0 &&
      devboxListBody.items.find((item) => item.metadata.name === devboxForm.name)
    ) {
      return jsonRes({
        code: 409,
        message: 'Devbox already exists'
      });
    }

  
    const organization = await devboxDB.organization.findUnique({
      where: {
        id: 'labring'
      }
    });
    
    if (!organization) throw Error('organization not found');
    
    const regionUid = getRegionUid();
    
    const templateRepository = await devboxDB.templateRepository.findFirst({
      where: {
        isPublic: true,
        isDeleted: false,
        organizationUid: organization.uid,
        regionUid,
        iconId: devboxForm.runtime  
      },
      select: {
        name: true,
        uid: true
      }
    });

    if (!templateRepository) {
      return jsonRes({
        code: 404,
        message: `Runtime '${devboxForm.runtime}' not found`
      });
    }

    const template = await devboxDB.template.findFirst({
      where: {
        templateRepositoryUid: templateRepository.uid,
        isDeleted: false
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
        code: 404,
        message: 'Template not found for runtime'
      });
    }

  
    const resourceConfig = convertResourceConfig(devboxForm.resource);

    console.log('Creating DevBox with config:', {
      name: devboxForm.name,
      runtime: devboxForm.runtime,
      resource: resourceConfig,
      portsCount: devboxForm.ports?.length || 0
    });

  
    const { DEVBOX_AFFINITY_ENABLE, SQUASH_ENABLE } = process.env;
    const devbox = json2DevboxV2(
      {
        ...devboxForm,
        ...resourceConfig,
        templateConfig: template.config,
        image: template.image,
        templateUid: template.uid,
        networks: [] 
      },
      DEVBOX_AFFINITY_ENABLE,
      SQUASH_ENABLE
    );

    await applyYamlList([devbox], 'create');

   
    const devboxBody = await waitForDevboxStatus(k8sCustomObjects, namespace, devboxForm.name);

    const resp = [devboxBody, [], template] as [KBDevboxTypeV2, [], typeof template];
    const adaptedData = adaptDevboxDetailV2(resp);

  
    const response = await k8sCore.readNamespacedSecret(devboxForm.name, namespace);
    const base64PrivateKey = response.body.data?.['SEALOS_DEVBOX_PRIVATE_KEY'] as string;

    if (!base64PrivateKey) {
      return jsonRes({
        code: 404,
        message: 'SSH keys not found'
      });
    }

    const config = parseTemplateConfig(template.config);

   
    let createdPorts: any[] = [];
    if (devboxForm.ports && devboxForm.ports.length > 0) {
      console.log(`Creating ${devboxForm.ports.length} ports for DevBox`);
      try {
        createdPorts = await createPortsAndNetworks(
          devboxForm.ports,
          devboxForm.name,
          namespace,
          k8sCore,
          k8sNetworkingApp,
          applyYamlList,
          k8sCustomObjects
        );
        console.log(`Successfully created ${createdPorts.length} ports`);
      } catch (error: any) {
        console.error('Failed to create ports:', error);
       
        return jsonRes({
          code: 201, 
          message: 'DevBox created successfully, but port creation had issues',
          data: {
            name: adaptedData.name,
            sshPort: adaptedData.sshPort,
            base64PrivateKey,
            userName: config.user,
            workingDir: config.workingDir,
            domain: process.env.SEALOS_DOMAIN,
            ports: [],
            portCreationError: error.message
          }
        });
      }
    }

    return jsonRes({
      data: {
        name: adaptedData.name,
        sshPort: adaptedData.sshPort,
        base64PrivateKey,
        userName: config.user,
        workingDir: config.workingDir,
        domain: process.env.SEALOS_DOMAIN,
        ports: createdPorts
      }
    });

  } catch (err: any) {
    console.error('DevBox creation error:', err);
    return jsonRes({
      code: 500,
      message: err?.message || 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? err : undefined
    });
  }
}