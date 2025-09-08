import { NextRequest } from 'next/server';
import { PatchUtils } from '@kubernetes/client-node';
import { V1Ingress, V1Service } from '@kubernetes/client-node';

import { authSession } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
import { jsonRes } from '@/services/backend/response';
import { devboxKey, ingressProtocolKey, publicDomainKey } from '@/constants/devbox';
import { json2Service, json2Ingress } from '@/utils/json2Yaml';
import { ProtocolType } from '@/types/devbox';
import { UpdatePortsRequestSchema, nanoid } from './schema';

export const dynamic = 'force-dynamic';


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
      console.log('No existing service found, starting with empty ports array');
    } else {
      console.error('Error fetching existing ports:', error);
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
    if (error instanceof PortError) {
      throw error;
    }
    console.error(`Failed to create port ${port}:`, error);
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
  

  const updatedPort = { ...existingPort, ...updateFields };
  
  try {

    if (updateFields.number && updateFields.number !== existingPort.number) {
      console.log(`Updating port number from ${existingPort.number} to ${updateFields.number} for ${portName}`);
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
    

    if (updateFields.hasOwnProperty('exposesPublicDomain') || updateFields.customDomain !== undefined) {
      const { INGRESS_SECRET, INGRESS_DOMAIN } = process.env;
      

      if (existingPort.networkName) {
        try {
          console.log(`Deleting existing ingress: ${existingPort.networkName}`);
          await k8sNetworkingApp.deleteNamespacedIngress(existingPort.networkName, namespace);
        } catch (error: any) {
          if (error.response?.statusCode !== 404) {
            console.warn(`Failed to delete existing ingress ${existingPort.networkName}:`, error);
          }
        }
      }
      

      if (updatedPort.exposesPublicDomain && INGRESS_SECRET) {
        const generatedPublicDomain = `${nanoid()}.${INGRESS_DOMAIN}`;
        const newNetworkName = `${devboxName}-${nanoid()}`;
        
        console.log(`Creating new ingress: ${newNetworkName} for port ${updatedPort.number}`);
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


    if (updateFields.protocol && updateFields.protocol !== existingPort.protocol && existingPort.networkName) {
      const { INGRESS_SECRET, INGRESS_DOMAIN } = process.env;
      
      if (INGRESS_SECRET) {
        console.log(`Updating protocol from ${existingPort.protocol} to ${updateFields.protocol} for ${portName}`);
        

        try {
          await k8sNetworkingApp.deleteNamespacedIngress(existingPort.networkName, namespace);
        } catch (error: any) {
          if (error.response?.statusCode !== 404) {
            console.warn(`Failed to delete existing ingress ${existingPort.networkName}:`, error);
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
        
        console.log(`Successfully updated protocol to ${updateFields.protocol} for port ${portName}`);
      }
    }
    
    console.log(`Successfully updated port: ${portName}`);
    return updatedPort;
  } catch (error: any) {
    if (error instanceof PortError) {
      throw error;
    }
    console.error(`Failed to update port ${portName}:`, error);
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
  const portToDelete = existingPorts.find(p => p.portName === portName);
  if (!portToDelete) {
    console.log(`Port ${portName} not found, skipping deletion`);
    return;
  }
  
  try {
    console.log(`Deleting port: ${portName} (${portToDelete.number})`);

    const serviceResponse = await k8sCore.readNamespacedService(devboxName, namespace);
    const existingService = serviceResponse.body;
    const updatedPorts = existingService.spec.ports.filter((p: any) => p.name !== portName);
    
    if (updatedPorts.length === 0) {

      console.log(`No ports remaining, deleting entire service: ${devboxName}`);
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
        console.log(`Deleting ingress: ${portToDelete.networkName}`);
        await k8sNetworkingApp.deleteNamespacedIngress(portToDelete.networkName, namespace);
      } catch (error: any) {
        if (error.response?.statusCode !== 404) {
          console.warn(`Failed to delete ingress ${portToDelete.networkName}:`, error);
        }
      }
    }
    
    console.log(`Successfully deleted port ${portName}`);
  } catch (error: any) {
    console.error(`Failed to delete port ${portName}:`, error);
    throw new PortError(`Failed to delete port '${portName}': ${error.message}`, 500, error);
  }
}

export async function PUT(req: NextRequest, { params }: { params: { name: string } }) {
  try {
    const body = await req.json();
    const validationResult = UpdatePortsRequestSchema.safeParse(body);
    
    if (!validationResult.success) {
      return jsonRes({
        code: 400,
        message: 'Invalid request parameters',
        error: {
          details: validationResult.error.errors,
          message: 'Request validation failed. Please check your port configurations.'
        }
      });
    }
    
    const { ports: requestPorts } = validationResult.data;
    const devboxName = params.name;
    const headerList = req.headers;
    
    console.log(`Starting port update operation for devbox: ${devboxName}`);
    console.log(`Request contains ${requestPorts.length} port configurations`);
    
    const { applyYamlList, k8sCore, k8sNetworkingApp, namespace } = await getK8s({
      kubeconfig: await authSession(headerList)
    });
    

    const existingPorts = await getExistingPorts(k8sCore, k8sNetworkingApp, devboxName, namespace);
    console.log(`Found ${existingPorts.length} existing ports:`, existingPorts.map(p => `${p.portName}:${p.number}`));
    
    const resultPorts = [];
    const requestPortNames = new Set<string>();
    

    for (const portConfig of requestPorts) {
      try {
        if ('portName' in portConfig && portConfig.portName) {
          console.log(`Updating existing port: ${portConfig.portName}`);

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
          console.log(`Successfully updated port: ${portConfig.portName}`);
        } else {
          console.log(`Creating new port: ${portConfig.number}`);

          const createdPort = await createNewPort(
            portConfig,
            devboxName,
            namespace,
            k8sCore,
            applyYamlList,
          );
          resultPorts.push(createdPort);
          console.log(`Successfully created port: ${createdPort.portName}:${createdPort.number}`);
        }
      } catch (error: any) {
        console.error(`Failed to process port configuration:`, portConfig, error);

        if (error instanceof PortError) {
          throw error;
        }
        throw new PortError(`Failed to process port configuration: ${error.message}`, 500, error);
      }
    }
    

    const portsToDelete = existingPorts.filter(
      existingPort => !requestPortNames.has(existingPort.portName)
    );
    
    console.log(`Deleting ${portsToDelete.length} ports:`, portsToDelete.map(p => p.portName));
    
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
    
    console.log(`Port update operation completed successfully. Final result:`, resultPorts);
    
    return jsonRes({
      data: {
        ports: resultPorts
      }
    });
  } catch (err: any) {
    console.error('Port update error:', err);
    

    if (err instanceof PortConflictError) {
      return jsonRes({
        code: err.code,
        message: err.message,
        error: {
          type: 'PORT_CONFLICT',
          details: err.details,
          suggestion: 'Please choose a different port number that is not already in use.'
        }
      });
    }
    
    if (err instanceof PortNotFoundError) {
      return jsonRes({
        code: err.code,
        message: err.message,
        error: {
          type: 'PORT_NOT_FOUND',
          details: err.details,
          suggestion: 'Please check the port name and ensure it exists before attempting to update.'
        }
      });
    }
    
    if (err instanceof PortError) {
      return jsonRes({
        code: err.code,
        message: err.message,
        error: {
          type: 'PORT_OPERATION_FAILED',
          details: err.details
        }
      });
    }
    

    return jsonRes({
      code: 500,
      message: err?.message || 'Internal server error occurred during port management',
      error: {
        type: 'INTERNAL_ERROR',
        details: process.env.NODE_ENV === 'development' ? err : undefined,
        suggestion: 'Please try again. If the problem persists, contact support.'
      }
    });
  }
}
