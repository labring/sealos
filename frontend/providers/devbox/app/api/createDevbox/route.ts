import { NextRequest } from 'next/server';

import { authSession } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
import { jsonRes } from '@/services/backend/response';
import { devboxDB } from '@/services/db/init';
import { KBDevboxTypeV2 } from '@/types/k8s';
import { json2DevboxV2, json2Ingress, json2Service } from '@/utils/json2Yaml';
import { RequestSchema } from './schema';

export const dynamic = 'force-dynamic';

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

    const { applyYamlList, k8sCustomObjects, namespace } = await getK8s({
      kubeconfig: await authSession(headerList)
    });

    const { body: devboxListBody } = (await k8sCustomObjects.listNamespacedCustomObject(
      'devbox.sealos.io',
      'v1alpha2',
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

    const template = await devboxDB.template.findUnique({
      where: {
        uid: devboxForm.templateUid,
        isDeleted: false
      },
      include: {
        templateRepository: {
          select: {
            uid: true
          }
        }
      }
    });

    if (!template) {
      return jsonRes({
        code: 404,
        message: 'Template not found'
      });
    }

    const { INGRESS_SECRET, DEVBOX_AFFINITY_ENABLE, STORAGE_LIMIT } = process.env;
    // TODO: this function can remove env params,because it is only backend
    const devbox = json2DevboxV2(devboxForm, DEVBOX_AFFINITY_ENABLE, STORAGE_LIMIT);
    const service = json2Service(devboxForm);
    const ingress = json2Ingress(devboxForm, INGRESS_SECRET as string);
    await applyYamlList([devbox, service, ingress], 'create');

    // Increment template repository usage count after successful devbox creation
    try {
      await devboxDB.templateRepository.update({
        where: {
          uid: template.templateRepository.uid,
          isDeleted: false
        },
        data: {
          usageCount: {
            increment: 1
          }
        }
      });
    } catch (usageError) {
      // Log the error but don't fail the devbox creation
      console.error('Failed to increment template usage count:', usageError);
    }

    return jsonRes({
      data: 'success create devbox'
    });
  } catch (err: any) {
    return jsonRes({
      code: 500,
      message: err?.message || 'Internal server error',
      error: err
    });
  }
}
