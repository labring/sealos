import { NextRequest, NextResponse } from 'next/server';
import { PatchUtils } from '@kubernetes/client-node';
import { authSession } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
import { jsonRes } from '@/services/backend/response';
import { devboxDB } from '@/services/db/init';
import { devboxKey} from '@/constants/devbox';
import { KBDevboxTypeV2 } from '@/types/k8s';
import { json2DevboxV2, json2Service, json2Ingress } from '@/utils/json2Yaml';
import { ProtocolType } from '@/types/devbox';
import { RequestSchema, nanoid } from './schema';
import { getRegionUid } from '@/utils/env';
import { adaptDevboxDetailV2 } from '@/utils/adapt';
import { parseTemplateConfig, cpuFormatToM, memoryFormatToMi } from '@/utils/tools';
import { generateDevboxRbacAndJob } from '@/utils/rbacJobGenerator';

export const dynamic = 'force-dynamic';

const PROTOCOL_MAP: Record<string, ProtocolType> = {
  http: 'HTTP',
  grpc: 'GRPC',
  ws: 'WS'
};

const resolveProtocol = (protocol?: string): ProtocolType => {
  if (!protocol) return 'HTTP';
  const normalized = protocol.toLowerCase();
  return PROTOCOL_MAP[normalized] ?? 'HTTP';
};

const RETRY_CONFIG = {
  MAX_RETRIES: 3,
  BASE_DELAY: 100,
  STATUS_CHECK_MAX_RETRIES: 10,
  STATUS_CHECK_INTERVAL: 100,
  READY_CHECK_MAX_RETRIES: 20,
  READY_CHECK_INTERVAL: 100
} as const;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

//retry—three
async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  maxRetries: number = RETRY_CONFIG.MAX_RETRIES,
  baseDelay: number = RETRY_CONFIG.BASE_DELAY,
  context: string = ''
): Promise<T> {
  let lastError: Error;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;

      if (attempt < maxRetries) {
        const delay = baseDelay * Math.pow(2, attempt - 1) + Math.random() * 100;
        await sleep(delay);
      }
    }
  }

  throw new Error(`${context} - All ${maxRetries} attempts failed. Last error: ${lastError!.message}`);
}

//check-devbox-status
async function waitForDevboxStatus(
  k8sCustomObjects: any,
  namespace: string,
  devboxName: string,
  maxRetries = RETRY_CONFIG.STATUS_CHECK_MAX_RETRIES,
  interval = RETRY_CONFIG.STATUS_CHECK_INTERVAL
): Promise<KBDevboxTypeV2> {
  for (let retries = 0; retries < maxRetries; retries++) {
    const { body: devboxBody } = await k8sCustomObjects.getNamespacedCustomObject(
      'devbox.sealos.io',
      'v1alpha2',
      namespace,
      'devboxes',
      devboxName
    ) as { body: KBDevboxTypeV2 };

    if (devboxBody.status) {
      return devboxBody;
    }
    await sleep(interval);
  }
  throw new Error('Timeout waiting for devbox status');
}

function convertResourceConfig(resource: { cpu: number; memory: number }) {
  return {
    cpu: resource.cpu * 1000,
    memory: resource.memory * 1024
  };
}

//check-devbox-pod
async function waitForDevboxReady(
  k8sCustomObjects: any,
  k8sCore: any,
  namespace: string,
  devboxName: string,
  maxRetries = RETRY_CONFIG.READY_CHECK_MAX_RETRIES,
  interval = RETRY_CONFIG.READY_CHECK_INTERVAL
): Promise<boolean> {
  for (let retries = 0; retries < maxRetries; retries++) {
    try {
      const { body: devboxBody } = await k8sCustomObjects.getNamespacedCustomObject(
        'devbox.sealos.io',
        'v1alpha2',
        namespace,
        'devboxes',
        devboxName
      ) as { body: KBDevboxTypeV2 };

      if (devboxBody.status?.phase === 'Running') {
        const podsResponse = await k8sCore.listNamespacedPod(
          namespace,
          undefined,
          undefined,
          undefined,
          undefined,
          `${devboxKey}=${devboxName}`
        );

        const readyPod = podsResponse.body.items.find((pod: any) =>
          pod.status?.phase === 'Running' &&
          pod.status?.conditions?.some((condition: any) =>
            condition.type === 'Ready' && condition.status === 'True'
          )
        );

        if (readyPod) {
          return true;
        }
      }
    } catch (error) {
    }

    await sleep(interval);
  }

  return false;
}

//service-manager——ports
class ServiceManager {
  private k8sCore: any;
  private namespace: string;
  private applyYamlList: any;

  constructor(k8sCore: any, namespace: string, applyYamlList: any) {
    this.k8sCore = k8sCore;
    this.namespace = namespace;
    this.applyYamlList = applyYamlList;
  }

  //ensure-service-with-ports:exists-update not-exists-create
  async ensureServiceWithPorts(devboxName: string, ports: any[]): Promise<void> {
    return retryWithBackoff(async () => {
      try {
        const serviceResponse = await this.k8sCore.readNamespacedService(devboxName, this.namespace);
        const existingService = serviceResponse.body;

        const existingPortNumbers = new Set(
          (existingService.spec?.ports || []).map((p: any) => p.port)
        );

        const newPorts = ports.filter(port => !existingPortNumbers.has(port.number));

        if (newPorts.length > 0) {
          await this.k8sCore.patchNamespacedService(
            devboxName,
            this.namespace,
            {
              spec: {
                ports: [
                  ...(existingService.spec?.ports || []),
                  ...newPorts.map(port => ({
                    port: port.number,
                    targetPort: port.number,
                    name: `port-${nanoid()}`
                  }))
                ]
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
    }, RETRY_CONFIG.MAX_RETRIES, 200, `Service management for ${devboxName}`);
  }

  private async createServiceWithAllPorts(devboxName: string, ports: any[]): Promise<void> {
    const networkConfig = {
      name: devboxName,
      networks: ports.map(port => ({
        networkName: `${devboxName}-${nanoid()}`,
        portName: `port-${nanoid()}`,
        port: port.number,
          protocol: resolveProtocol(port.protocol),
        openPublicDomain: port.isPublic || false,
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
            protocol: resolveProtocol(portConfig.protocol),
            openPublicDomain: portConfig.isPublic || false,
            publicDomain: generatedPublicDomain,
            customDomain: portConfig.customDomain || ''
          }
        ]
      };

      const ingressYaml = json2Ingress(networkConfig, this.ingressSecret);
      await this.applyYamlList([ingressYaml], 'create');

      return { networkName, publicDomain: generatedPublicDomain };
    }, RETRY_CONFIG.MAX_RETRIES, 200, `Ingress creation for ${devboxName}:${portConfig.number}`);
  }
}

//create-ports-and-networks
async function createPortsAndNetworks(
  ports: Array<{ number: number; protocol?: string; isPublic?: boolean; customDomain?: string }>,
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
        const servicePortInfo = await serviceManager.getServicePortInfo(devboxName, portConfig.number);
        const portName = servicePortInfo?.portName || `port-${nanoid()}`;

        let networkName = '';
        let publicDomain = '';

        if (portConfig.isPublic && ingressManager) {
          const ingressResult = await ingressManager.createIngress(devboxName, portConfig);
          networkName = ingressResult.networkName;
          publicDomain = ingressResult.publicDomain;
        }

        return {
          portName,
          number: portConfig.number,
          protocol: portConfig.protocol || 'http',
          networkName,
          isPublic: portConfig.isPublic || false,
          publicDomain: (portConfig.isPublic && publicDomain) ? publicDomain : '',
          customDomain: portConfig.customDomain || '',
          serviceName: devboxName,
          privateAddress: `http://${devboxName}.${namespace}:${portConfig.number}`
        };
      })
    );

    return portResults.map((result, index) => {
      const portConfig = ports[index];

      if (result.status === 'fulfilled') {
        return result.value;
      }

      return {
        portName: `port-${portConfig.number}-failed`,
        number: portConfig.number,
        protocol: portConfig.protocol || 'http',
        networkName: '',
        isPublic: portConfig.isPublic || false,
        publicDomain: '',
        customDomain: portConfig.customDomain || '',
        serviceName: devboxName,
        privateAddress: `http://${devboxName}.${namespace}:${portConfig.number}`,
        error: result.reason?.message || 'Unknown error'
      };
    });

  } catch (error: any) {
    return ports.map(portConfig => ({
      portName: `port-${portConfig.number}-failed`,
      number: portConfig.number,
      protocol: portConfig.protocol || 'http',
      networkName: '',
      isPublic: portConfig.isPublic || false,
      publicDomain: '',
      customDomain: portConfig.customDomain || '',
      serviceName: devboxName,
      privateAddress: `http://${devboxName}.${namespace}:${portConfig.number}`,
      error: `Service creation failed: ${error.message}`
    }));
  }
}

//handle-autostart
async function handleAutostart(
  devboxName: string,
  namespace: string,
  devboxUID: string,
  applyYamlList: any,
  execCommand?: string
): Promise<boolean> {
  try {
    //1.generate-rbac-and-job-yamls
    const rbacJobYamls = generateDevboxRbacAndJob({
      devboxName,
      devboxNamespace: namespace,
      devboxUID,
      execCommand
    });

    //2.apply-rbac-and-job-yamls
    await applyYamlList(rbacJobYamls, 'create');
    return true;
  } catch (error) {
    console.error('Failed to create autostart resources:', error);
    return false;
  }
}

type PortResult = {
  portName: string;
  number: number;
  protocol: string;
  networkName: string;
  isPublic: boolean;
  publicDomain: string;
  customDomain: string;
  serviceName: string;
  privateAddress: string;
  error?: string;
};

function buildPortResponseData(
  createdPorts: PortResult[],
  adaptedData: any,
  base64PrivateKey: string,
  userName: string,
  workingDir: string,
  domain: string | undefined,
  autostartSuccess: boolean | undefined
) {
  const failedPorts = createdPorts.filter((port): port is PortResult & { error: string } => !!port.error);
  const successfulPorts = createdPorts.filter(port => !port.error);

  return {
    name: adaptedData.name,
    sshPort: adaptedData.sshPort,
    base64PrivateKey,
    userName,
    workingDir,
    domain,
    ports: createdPorts,
    ...(autostartSuccess !== undefined && { autostarted: autostartSuccess }),
    ...(failedPorts.length > 0 && {
      portErrors: failedPorts.map(p => ({ port: p.number, error: p.error }))
    }),
    summary: {
      totalPorts: createdPorts.length,
      successfulPorts: successfulPorts.length,
      failedPorts: failedPorts.length
    }
  };
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
    const { applyYamlList, k8sCustomObjects, namespace, k8sCore, k8sNetworkingApp } = await getK8s({
      kubeconfig: await authSession(req.headers)
    });

    const { body: devboxListBody } = await k8sCustomObjects.listNamespacedCustomObject(
      'devbox.sealos.io',
      'v1alpha2',
      namespace,
      'devboxes'
    ) as { body: { items: KBDevboxTypeV2[] } };

    if (devboxListBody?.items?.find(item => item.metadata.name === devboxForm.name)) {
      return jsonRes({
        code: 409,
        message: 'Devbox already exists'
      });
    }

    const regionUid = getRegionUid();

    const template = await devboxDB.template.findFirst({
      where: {
        isDeleted: false,
        templateRepository: {
          isDeleted: false,
          regionUid,
          isPublic: true,
          iconId: devboxForm.runtime,
          templateRepositoryTags: {
            some: {
              tag: {
                type: 'OFFICIAL_CONTENT'
              }
            }
          }
        }
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
        message: `Runtime '${devboxForm.runtime}' not found or not available`
      });
    }

    // Parse template config to get default ports
    const templateConfig = parseTemplateConfig(template.config);
    let finalPorts = devboxForm.ports || [];

    // If user didn't specify ports, use template's default appPorts
    if (!devboxForm.ports || devboxForm.ports.length === 0) {
      if (templateConfig.appPorts && templateConfig.appPorts.length > 0) {
        finalPorts = templateConfig.appPorts.map((appPort: any) => ({
          number: appPort.port,
          protocol: appPort.protocol?.toLowerCase() || 'http',
          isPublic: true    // Default to public for template ports
        }));
      }
    }

    const resourceConfig = convertResourceConfig(devboxForm.quota);
    const { DEVBOX_AFFINITY_ENABLE, STORAGE_LIMIT } = process.env;
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
      STORAGE_LIMIT
    );

    const [devboxBody, createdPorts] = await Promise.all([
      applyYamlList([devbox], 'create').then(() =>
        waitForDevboxStatus(k8sCustomObjects, namespace, devboxForm.name)
      ),
      finalPorts?.length
        ? createPortsAndNetworks(
            finalPorts,
            devboxForm.name,
            namespace,
            k8sCore,
            k8sNetworkingApp,
            applyYamlList
          )
        : Promise.resolve([])
    ]);

    let autostartSuccess: boolean | undefined;
    if (devboxForm.autostart && devboxBody.metadata?.uid) {
      const execCommand = templateConfig.releaseCommand && templateConfig.releaseArgs
        ? `${templateConfig.releaseCommand.join(' ')} ${templateConfig.releaseArgs.join(' ')}`
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

    //3.read-ssh-keys！！！！！
    const response = await k8sCore.readNamespacedSecret(devboxForm.name, namespace);
    const base64PrivateKey = response.body.data?.['SEALOS_DEVBOX_PRIVATE_KEY'] as string;

    if (!base64PrivateKey) {
      return jsonRes({
        code: 404,
        message: 'SSH keys not found'
      });
    }

    const { user: userName, workingDir } = templateConfig;
    const { SEALOS_DOMAIN: domain } = process.env;

    const responseData = buildPortResponseData(
      createdPorts,
      adaptedData,
      base64PrivateKey,
      userName,
      workingDir,
      domain,
      autostartSuccess
    );

    const hasFailedPorts = createdPorts.some(port => 'error' in port && port.error);

    if (hasFailedPorts) {
      const failedCount = createdPorts.filter(p => 'error' in p && p.error).length;
      return jsonRes({
        code: 500,
        message: `DevBox created, but ${failedCount} port(s) had issues${devboxForm.autostart ? (autostartSuccess ? ', autostart succeeded' : ', autostart failed') : ''}`,
        data: responseData
      });
    }

    // Success: return 204 No Content
    return new NextResponse(null, { status: 204 });

  } catch (err: any) {
    return jsonRes({
      code: 500,
      message: err?.message || 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? err : undefined
    });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { k8sCustomObjects, namespace } = await getK8s({
      kubeconfig: await authSession(req.headers)
    });
    //1.Kubernetes get DevBox-list
    const devboxResponse = await k8sCustomObjects.listNamespacedCustomObject(
      'devbox.sealos.io',
      'v1alpha2',
      namespace,
      'devboxes'
    );

    const devboxBody = devboxResponse.body as { items: KBDevboxTypeV2[] };
    //2.get-template-uid
    const uidList = devboxBody.items.map(item => item.spec.templateID);
  //3.uid to database search template
    const templateResultList = await devboxDB.template.findMany({
      where: {
        uid: {
          in: uidList
        }
      },
      select: {
        uid: true,
        templateRepository: {
          select: {
            iconId: true
          }
        }
      }
    });

    const templateMap = new Map(
      templateResultList.map(template => [template.uid, template.templateRepository.iconId])
    );

    const data = devboxBody.items
      .map(item => {
        const runtime = templateMap.get(item.spec.templateID);
        if (!runtime) return null;

        return {
          name: item.metadata.name,
          uid: item.metadata.uid,
          resourceType: 'devbox' as const,
          runtime,
          status: (item.status?.phase || 'pending').toLowerCase(),
          quota: {
            cpu: cpuFormatToM(item.spec.resource.cpu) / 1000,
            memory: memoryFormatToMi(item.spec.resource.memory) / 1024
          }
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);

    return NextResponse.json(data);
  } catch (err: any) {
    return jsonRes({
      code: 500,
      message: err?.message || 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? err : undefined
    });
  }
}