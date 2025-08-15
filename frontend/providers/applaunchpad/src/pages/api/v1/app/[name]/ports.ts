import { NextApiRequest, NextApiResponse } from 'next';
import { jsonRes } from '@/services/backend/response';
import { createK8sContext, getAppByName, processAppResponse } from '@/services/backend';
import { PatchUtils, V1Deployment, V1StatefulSet } from '@kubernetes/client-node';
import { UpdatePortsSchema } from '@/types/request_schema';
import { customAlphabet } from 'nanoid';
import { json2Service, json2Ingress } from '@/utils/deployYaml2Json';
import type { AppEditType } from '@/types/app';

const nanoid = customAlphabet('abcdefghijklmnopqrstuvwxyz', 12);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== 'PATCH') {
      return jsonRes(res, {
        code: 405,
        error: `Method ${req.method} Not Allowed`
      });
    }

    const { name: appName } = req.query as { name: string };

    const k8s = await createK8sContext(req);
    const currentAppResponse = await getAppByName(appName, k8s);
    const currentAppData = await processAppResponse(currentAppResponse, false);

    const parseResult = UpdatePortsSchema.safeParse(req.body);
    if (!parseResult.success) {
      return jsonRes(res, {
        code: 400,
        error: parseResult.error
      });
    }

    const { ports } = parseResult.data;
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

    // validate ports
    const uniquePorts = new Set(ports.map((p) => p.port));
    if (uniquePorts.size !== ports.length) {
      return jsonRes(res, {
        code: 400,
        error: 'Duplicate ports are not allowed'
      });
    }

    const networks = ports.map((port) => {
      // check if there is a unique identifier (networkName, portName, serviceName)
      // Only consider it an update if we can find an existing port with matching identifiers
      const existingPort = currentAppData.networks?.find(
        (n) =>
          n.port === port.port &&
          ((port.networkName && n.networkName === port.networkName) ||
            (port.portName && n.portName === port.portName) ||
            (port.serviceName && n.serviceName === port.serviceName))
      );
      const isUpdate = !!existingPort;

      if (isUpdate) {
        return {
          ...existingPort,
          port: port.port,
          protocol: port.protocol,
          appProtocol: port.appProtocol || 'HTTP',
          openPublicDomain: port.exposesPublicDomain,
          openNodePort: !port.appProtocol,
          // Ensure required fields are always present
          networkName: existingPort?.networkName || `network-${nanoid()}`,
          portName: existingPort?.portName || nanoid(),
          serviceName: existingPort?.serviceName || `service-${nanoid()}`,
          publicDomain: existingPort?.publicDomain || nanoid(),
          domain: existingPort?.domain || global.AppConfig?.cloud?.domain || 'cloud.sealos.io',
          customDomain: existingPort?.customDomain || ''
        };
      } else {
        // For new ports, create complete configuration
        return {
          serviceName: `service-${nanoid()}`,
          networkName: `network-${nanoid()}`,
          portName: nanoid(),
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
      }
    });

    try {
      const containerPorts = networks.map((network) => ({
        containerPort: network.port,
        name: network.portName,
        protocol: network.protocol
      }));

      const deploymentPatch = {
        spec: {
          template: {
            spec: {
              containers: [
                {
                  name: app.spec.template.spec.containers[0].name,
                  ports: containerPorts
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
          deploymentPatch,
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
          deploymentPatch,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          { headers: { 'Content-type': PatchUtils.PATCH_FORMAT_STRATEGIC_MERGE_PATCH } }
        );
      } else {
        throw new Error(`Unsupported app kind: ${app.kind}`);
      }

      const updatedPorts = new Set(networks.map((n) => n.port));

      const mergedNetworks = [
        ...(currentAppData?.networks?.filter((existing) => !updatedPorts.has(existing.port)) || []),

        ...networks
      ];

      const appEditData: AppEditType = {
        ...currentAppData,
        networks: mergedNetworks
      };
      console.log(appEditData, 'appEditData');

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

      const response = await getAppByName(appName, k8s);
      const filteredData = await processAppResponse(response);

      return jsonRes(res, {
        data: filteredData
      });
    } catch (error: any) {
      console.error('Failed to update ports:', error);
      return jsonRes(res, {
        code: 500,
        error: error.message || 'Failed to update ports'
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
