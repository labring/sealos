import { NextRequest } from 'next/server';

import { authSession } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
import { jsonRes } from '@/services/backend/response';
import { devboxDB } from '@/services/db/init';
import { KBDevboxTypeV2 } from '@/types/k8s';
import { json2DevboxV2 } from '@/utils/json2Yaml';
import { RequestSchema } from './schema';
import { getRegionUid } from '@/utils/env';
import { adaptDevboxDetailV2 } from '@/utils/adapt';
import { parseTemplateConfig } from '@/utils/tools';

export const dynamic = 'force-dynamic';

// sleep util
function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// wait for devbox status util
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

    const { applyYamlList, k8sCustomObjects, namespace, k8sCore } = await getK8s({
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

    // get template repository list
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
        name: devboxForm.runtimeName
      },
      select: {
        name: true,
        uid: true
      }
    });

    if (!templateRepository) {
      return jsonRes({
        code: 404,
        message: 'Runtime not found'
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
        message: 'Runtime not found'
      });
    }

    const { DEVBOX_AFFINITY_ENABLE, SQUASH_ENABLE } = process.env;
    const devbox = json2DevboxV2(
      {
        ...devboxForm,
        templateConfig: template.config,
        image: template.image,
        templateUid: template.uid,
        networks: []
      },
      DEVBOX_AFFINITY_ENABLE,
      SQUASH_ENABLE
    );

    await applyYamlList([devbox], 'create');

    // return devbox detail
    const devboxBody = await waitForDevboxStatus(k8sCustomObjects, namespace, devboxForm.name);

    const resp = [devboxBody, [], template] as [KBDevboxTypeV2, [], typeof template];

    const adaptedData = adaptDevboxDetailV2(resp);

    // get ssh info
    const response = await k8sCore.readNamespacedSecret(devboxForm.name, namespace);
    const base64PrivateKey = response.body.data?.['SEALOS_DEVBOX_PRIVATE_KEY'] as string;

    if (!base64PrivateKey) {
      return jsonRes({
        code: 404,
        message: 'SSH keys not found'
      });
    }

    const config = parseTemplateConfig(template.config);

    return jsonRes({
      data: {
        name: adaptedData.name,
        sshPort: adaptedData.sshPort,
        base64PrivateKey,
        userName: config.user,
        workingDir: config.workingDir,
        domain: process.env.SEALOS_DOMAIN
      }
    });
  } catch (err: any) {
    return jsonRes({
      code: 500,
      message: err?.message || 'Internal server error',
      error: err
    });
  }
}
