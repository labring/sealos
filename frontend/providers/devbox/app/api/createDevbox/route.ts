import { NextRequest } from 'next/server';

import { authSession } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
import { jsonRes } from '@/services/backend/response';
import { devboxDB } from '@/services/db/init';
import {
  ensureDevboxOwnerReferences,
  getDevboxOwnerReference,
  markDevboxOwnerReferencesReady
} from '@/services/backend/ownerReferences';
import {
  json2DevboxV2,
  json2Ingress,
  json2Service,
  json2ConfigMap,
  json2PVC
} from '@/utils/json2Yaml';
import { getTemplateDefaults, getRuntimeTemplateConfig } from '@/utils/templateConfig';
import { RequestSchema } from './schema';
import { KBDevboxTypeV2 } from '@/types/k8s';

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
    const hasExplicitEnvs = Object.prototype.hasOwnProperty.call(body, 'envs');
    const hasExplicitConfigMaps = Object.prototype.hasOwnProperty.call(body, 'configMaps');
    const headerList = req.headers;

    const { applyYamlList, k8sCustomObjects, k8sCore, k8sNetworkingApp, namespace } = await getK8s({
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

    const { INGRESS_SECRET, DEVBOX_AFFINITY_ENABLE, SQUASH_ENABLE, NFS_STORAGE_CLASS_NAME } =
      process.env;
    const templateDefaults = getTemplateDefaults(template.config);
    const finalDevboxForm = {
      ...devboxForm,
      templateConfig: getRuntimeTemplateConfig(devboxForm.templateConfig),
      envs: hasExplicitEnvs ? devboxForm.envs : templateDefaults.envs || [],
      configMaps:
        hasExplicitConfigMaps ? devboxForm.configMaps : templateDefaults.configMaps || []
    };

    // Create PVC first (if volumes exist)
    const pvc = json2PVC(finalDevboxForm, NFS_STORAGE_CLASS_NAME || 'nfs-csi');

    // Create ConfigMap (if configMaps exist)
    const configMap = json2ConfigMap(finalDevboxForm);

    // Create Devbox
    const devbox = json2DevboxV2(finalDevboxForm, DEVBOX_AFFINITY_ENABLE, SQUASH_ENABLE);
    const preYamlList = [pvc, configMap].filter((yaml) => yaml !== '');
    if (preYamlList.length > 0) {
      await applyYamlList(preYamlList, 'create');
    }
    await applyYamlList([devbox], 'create');

    const ownerReference = await getDevboxOwnerReference(
      k8sCustomObjects,
      namespace,
      finalDevboxForm.name
    );
    const service = json2Service(finalDevboxForm, ownerReference || undefined);
    const ingress = json2Ingress(
      finalDevboxForm,
      INGRESS_SECRET as string,
      ownerReference || undefined
    );

    const postYamlList = [service, ingress].filter((yaml) => yaml !== '');
    if (postYamlList.length > 0) {
      await applyYamlList(postYamlList, 'create');
    }

    const ownerReferencesReady = await ensureDevboxOwnerReferences({
      devboxName: finalDevboxForm.name,
      namespace,
      ownerReference,
      k8sCore,
      k8sNetworkingApp,
      k8sCustomObjects
    });
    if (ownerReferencesReady) {
      await markDevboxOwnerReferencesReady(
        k8sCustomObjects,
        namespace,
        finalDevboxForm.name,
        ownerReference
      );
    }

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
