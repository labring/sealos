import { NextRequest } from 'next/server';
import { customAlphabet } from 'nanoid';

import { authSession } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
import { jsonRes } from '@/services/backend/response';
import { devboxDB } from '@/services/db/init';
import { KBDevboxTypeV2 } from '@/types/k8s';
import { json2DevboxV2, json2Service, json2Ingress } from '@/utils/json2Yaml';
import { GitImportRequestSchema } from './schema';
import { getRegionUid } from '@/utils/env';
import {
  waitForDevboxStatus,
  waitForDevboxReady,
  DEVBOX_IMPORT_CONSTANTS
} from '@/utils/devboxImportHelper';

export const dynamic = 'force-dynamic';

const nanoid = customAlphabet('abcdefghijklmnopqrstuvwxyz', 12);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validationResult = GitImportRequestSchema.safeParse(body);

    if (!validationResult.success) {
      return jsonRes({
        code: 400,
        message: 'Invalid request body',
        error: validationResult.error.errors
      });
    }

    const importRequest = validationResult.data;
    const headerList = req.headers;

    const { applyYamlList, k8sCustomObjects, namespace, k8sCore } = await getK8s({
      kubeconfig: await authSession(headerList)
    });

    // Check if devbox already exists
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
      devboxListBody.items.find((item) => item.metadata.name === importRequest.name)
    ) {
      return jsonRes({
        code: 409,
        message: 'Devbox already exists'
      });
    }

    const regionUid = getRegionUid();

    // Get template
    const template = await devboxDB.template.findFirst({
      where: {
        uid: importRequest.templateUid,
        isDeleted: false,
        templateRepository: {
          isDeleted: false,
          regionUid,
          isPublic: true
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
        message: `Template not found`
      });
    }

    const { DEVBOX_AFFINITY_ENABLE, SQUASH_ENABLE, INGRESS_SECRET, SEALOS_DOMAIN } = process.env;

    const devboxData = {
      name: importRequest.name,
      cpu: importRequest.cpu,
      memory: importRequest.memory,
      templateConfig: template.config,
      image: template.image,
      templateUid: template.uid,
      networks: [
        {
          networkName: `${importRequest.name}-${nanoid()}`,
          port: importRequest.containerPort,
          portName: 'app-port',
          protocol: 'HTTP' as const,
          openPublicDomain: true,
          publicDomain: `${nanoid()}.${SEALOS_DOMAIN}`,
          customDomain: ''
        }
      ],
      env: []
    };

    // Create DevBox, Service and Ingress
    const devbox = json2DevboxV2(devboxData, DEVBOX_AFFINITY_ENABLE, SQUASH_ENABLE);
    const service = json2Service(devboxData);
    const ingress = json2Ingress(devboxData, INGRESS_SECRET as string);

    // Apply all resources
    await applyYamlList([devbox, service, ingress], 'create');
    const devboxBody = await waitForDevboxStatus(k8sCustomObjects, namespace, importRequest.name);

    const isReady = await waitForDevboxReady(
      k8sCustomObjects,
      k8sCore,
      namespace,
      importRequest.name,
      DEVBOX_IMPORT_CONSTANTS.WAIT_FOR_READY_RETRIES,
      DEVBOX_IMPORT_CONSTANTS.WAIT_FOR_READY_INTERVAL
    );

    if (!isReady) {
      return jsonRes({
        code: 500,
        message: 'DevBox failed to become ready within timeout'
      });
    }

    return jsonRes({
      data: {
        devboxName: importRequest.name,
        sshPort: devboxBody.status?.network?.nodePort
      }
    });
  } catch (err: any) {
    console.error('Git import error:', err);
    return jsonRes({
      code: 500,
      message: err?.message || 'Internal server error'
    });
  }
}
