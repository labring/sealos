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
import { generateDevboxRbacAndJob } from '@/utils/rbacJobGenerator';

export const dynamic = 'force-dynamic';

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 100,
  context: string = ''
): Promise<T> {
  let lastError: any;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;
      
      if (attempt < maxRetries) {
        const delay = baseDelay * Math.pow(2, attempt - 1) + Math.random() * 100; 
        await sleep(delay);
      }
    }
  }
  
  throw new Error(`${context} - All ${maxRetries} attempts failed. Last error: ${lastError?.message}`);
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
            return true;
          }
        } catch (podError) {

        }
      }
    } catch (error) {

    }
    
    await sleep(interval);
    retries++;
  }
  
  return false;
}

class ServiceManager {
  private k8sCore: any;
  private namespace: string;
  private applyYamlList: any;

  constructor(k8sCore: any, namespace: string, applyYamlList: any) {
    this.k8sCore = k8sCore;
    this.namespace = namespace;
    this.applyYamlList = applyYamlList;
  }

  async ensureServiceWithPorts(devboxName: string, ports: any[]): Promise<void> {
    return retryWithBackoff(async () => {
      try {

        const serviceResponse = await this.k8sCore.readNamespacedService(devboxName, this.namespace);
        const existingService = serviceResponse.body;
        
 
        const existingPorts = existingService.spec?.ports || [];
        const existingPortNumbers = new Set(existingPorts.map((p: any) => p.port));
        
        const newPorts = ports.filter(port => !existingPortNumbers.has(port.number));
        
        if (newPorts.length > 0) {
          const updatedPorts = [
            ...existingPorts,
            ...newPorts.map(port => ({
              port: port.number,
              targetPort: port.number,
              name: `port-${nanoid()}`
            }))
          ];
          
          await this.k8sCore.patchNamespacedService(
            devboxName,
            this.namespace,
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
            { 
              headers: { 
                'Content-Type': PatchUtils.PATCH_FORMAT_JSON_MERGE_PATCH
              } 
            }
          );
        }
      } catch (error: any) {
        if (error.response?.statusCode === 404) {
   
          await this.createServiceWithAllPorts(devboxName, ports);
        } else {
          throw error;
        }
      }
    }, 3, 200, `Service management for ${devboxName}`);
  }

  private async createServiceWithAllPorts(devboxName: string, ports: any[]): Promise<void> {
    const networkConfig = {
      name: devboxName,
      networks: ports.map(port => ({
        networkName: `${devboxName}-${nanoid()}`,
        portName: `port-${nanoid()}`,
        port: port.number,
        protocol: (port.protocol || 'HTTP') as ProtocolType,
        openPublicDomain: port.exposesPublicDomain || false,
        publicDomain: '',
        customDomain: port.customDomain || ''
      }))
    };

    await this.applyYamlList([json2Service(networkConfig)], 'create');
  }

  async getServicePortInfo(devboxName: string, portNumber: number): Promise<{ portName: string } | null> {
    try {
      const serviceResponse = await this.k8sCore.readNamespacedService(devboxName, this.namespace);
      const existingService = serviceResponse.body;
      const existingPorts = existingService.spec?.ports || [];
      
      const portInfo = existingPorts.find((p: any) => p.port === portNumber);
      return portInfo ? { portName: portInfo.name } : null;
    } catch (error) {
      return null;
    }
  }
}

class IngressManager {
  private applyYamlList: any;
  private ingressSecret: string;
  private ingressDomain: string;

  constructor(applyYamlList: any, ingressSecret: string, ingressDomain: string) {
    this.applyYamlList = applyYamlList;
    this.ingressSecret = ingressSecret;
    this.ingressDomain = ingressDomain;
  }

  async createIngress(devboxName: string, portConfig: any): Promise<{ networkName: string; publicDomain: string }> {
    const networkName = `${devboxName}-${nanoid()}`;
    const generatedPublicDomain = `${nanoid()}.${this.ingressDomain}`;
    
    return retryWithBackoff(async () => {
      const networkConfig = {
        name: devboxName,
        networks: [
          {
            networkName,
            portName: `port-${nanoid()}`,
            port: portConfig.number,
            protocol: (portConfig.protocol || 'HTTP') as ProtocolType,
            openPublicDomain: portConfig.exposesPublicDomain || false,
            publicDomain: generatedPublicDomain,
            customDomain: portConfig.customDomain || ''
          }
        ]
      };
      
      const ingressYaml = json2Ingress(networkConfig, this.ingressSecret);
      await this.applyYamlList([ingressYaml], 'create');
      
      return { networkName, publicDomain: generatedPublicDomain };
    }, 3, 200, `Ingress creation for ${devboxName}:${portConfig.number}`);
  }
}

async function createPortsAndNetworks(
  ports: Array<{ number: number; protocol?: string; exposesPublicDomain?: boolean; customDomain?: string }>,
  devboxName: string,
  namespace: string,
  k8sCore: any,
  k8sNetworkingApp: any,
  applyYamlList: any
) {
  if (!ports.length) {
    return [];
  }

  const { INGRESS_SECRET, INGRESS_DOMAIN } = process.env;
  const serviceManager = new ServiceManager(k8sCore, namespace, applyYamlList);
  const ingressManager = INGRESS_SECRET ? new IngressManager(applyYamlList, INGRESS_SECRET, INGRESS_DOMAIN!) : null;

  try {
    await serviceManager.ensureServiceWithPorts(devboxName, ports);
  
    const portResults = await Promise.allSettled(
      ports.map(async (portConfig) => {
        try {
          const servicePortInfo = await serviceManager.getServicePortInfo(devboxName, portConfig.number);
          const portName = servicePortInfo?.portName || `port-${nanoid()}`;
          
          let networkName = '';
          let publicDomain = '';
          
          if (portConfig.exposesPublicDomain && ingressManager) {
            const ingressResult = await ingressManager.createIngress(devboxName, portConfig);
            networkName = ingressResult.networkName;
            publicDomain = ingressResult.publicDomain;
          }
          
          const result = {
            portName,
            number: portConfig.number,
            protocol: portConfig.protocol || 'HTTP',
            networkName,
            exposesPublicDomain: portConfig.exposesPublicDomain || false,
            publicDomain: (portConfig.exposesPublicDomain && publicDomain) ? publicDomain : '',
            customDomain: portConfig.customDomain || '',
            serviceName: devboxName,
            privateAddress: `http://${devboxName}.${namespace}:${portConfig.number}`
          };
          
          return result;
          
        } catch (error: any) {
          throw error;
        }
      })
    );

    const finalResults = portResults.map((result, index) => {
      const portConfig = ports[index];
      
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        return {
          portName: `port-${portConfig.number}-failed`,
          number: portConfig.number,
          protocol: portConfig.protocol || 'HTTP',
          networkName: '',
          exposesPublicDomain: portConfig.exposesPublicDomain || false, 
          publicDomain: '',
          customDomain: portConfig.customDomain || '',
          serviceName: devboxName,
          privateAddress: `http://${devboxName}.${namespace}:${portConfig.number}`,
          error: result.reason?.message || 'Unknown error'
        };
      }
    });

    const successCount = finalResults.filter(r => !('error' in r) || !r.error).length;
    const failureCount = finalResults.length - successCount;
    
    return finalResults;

  } catch (error: any) {
    
    return ports.map(portConfig => ({
      portName: `port-${portConfig.number}-failed`,
      number: portConfig.number,
      protocol: portConfig.protocol || 'HTTP',
      networkName: '',
      exposesPublicDomain: portConfig.exposesPublicDomain || false, 
      publicDomain: '',
      customDomain: portConfig.customDomain || '',
      serviceName: devboxName,
      privateAddress: `http://${devboxName}.${namespace}:${portConfig.number}`,
      error: `Service creation failed: ${error.message}`
    }));
  }
}

async function handleAutostart(
  devboxName: string,
  namespace: string,
  devboxUID: string,
  applyYamlList: any,
  execCommand?: string
): Promise<boolean> {
  try {
    const rbacJobYamls = generateDevboxRbacAndJob({
      devboxName,
      devboxNamespace: namespace,
      devboxUID,
      execCommand
    });
    
    await applyYamlList(rbacJobYamls, 'create');
    return true;
  } catch (error: any) {
    console.error('Failed to create autostart resources:', error);
    return false;
  }
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
    const { DEVBOX_AFFINITY_ENABLE, SQUASH_ENABLE } = process.env;
    const devbox = json2DevboxV2(
      {
        ...devboxForm,
        ...resourceConfig,
        templateConfig: template.config,
        image: template.image,
        templateUid: template.uid,
        networks: [], 
        env: devboxForm.env || []
      },
      DEVBOX_AFFINITY_ENABLE,
      SQUASH_ENABLE
    );

    const [devboxBody, createdPorts] = await Promise.all([

      (async () => {
        await applyYamlList([devbox], 'create');
        return await waitForDevboxStatus(k8sCustomObjects, namespace, devboxForm.name);
      })(),

      (async () => {
        if (devboxForm.ports && devboxForm.ports.length > 0) {
          return await createPortsAndNetworks(
            devboxForm.ports,
            devboxForm.name,
            namespace,
            k8sCore,
            k8sNetworkingApp,
            applyYamlList
          );
        }
        return [];
      })()
    ]);

    let autostartSuccess = false;
    if (devboxForm.autostart && devboxBody.metadata?.uid) {
      const config = parseTemplateConfig(template.config);
      const execCommand = config.releaseCommand && config.releaseArgs 
        ? `${config.releaseCommand.join(' ')} ${config.releaseArgs.join(' ')}`
        : '/bin/bash /home/devbox/project/entrypoint.sh';
        
      autostartSuccess = await handleAutostart(
        devboxForm.name,
        namespace,
        devboxBody.metadata.uid,
        applyYamlList,
        execCommand
      );
    }

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
    const { user: userName, workingDir } = config;
    const { SEALOS_DOMAIN: domain } = process.env;

    const failedPorts = createdPorts.filter((port: any) => 'error' in port && port.error);
    const successfulPorts = createdPorts.filter((port: any) => !('error' in port) || !port.error);

    if (failedPorts.length > 0) {
      return jsonRes({
        code: 201, 
        message: `DevBox created successfully, but ${failedPorts.length} port(s) had issues${devboxForm.autostart ? (autostartSuccess ? ', autostart succeeded' : ', autostart failed') : ''}`,
        data: {
          name: adaptedData.name,
          sshPort: adaptedData.sshPort,
          base64PrivateKey,
          userName,
          workingDir,
          domain,
          ports: createdPorts,
          portErrors: failedPorts.map((p: any) => ({ port: p.number, error: p.error })),
          autostarted: devboxForm.autostart ? autostartSuccess : undefined,
          summary: {
            totalPorts: createdPorts.length,
            successfulPorts: successfulPorts.length,
            failedPorts: failedPorts.length
          }
        }
      });
    }

    return jsonRes({
      data: {
        name: adaptedData.name,
        sshPort: adaptedData.sshPort,
        base64PrivateKey,
        userName,
        workingDir,
        domain,
        ports: createdPorts,
        autostarted: devboxForm.autostart ? autostartSuccess : undefined,
        summary: {
          totalPorts: createdPorts.length,
          successfulPorts: successfulPorts.length,
          failedPorts: 0
        }
      }
    });

  } catch (err: any) {
    return jsonRes({
      code: 500,
      message: err?.message || 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? err : undefined
    });
  }
}