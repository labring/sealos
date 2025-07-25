import { TagType, TemplateRepositoryKind } from '@/prisma/generated/client';
import { authSessionWithJWT } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
import { jsonRes } from '@/services/backend/response';
import { devboxDB } from '@/services/db/init';
import { ERROR_ENUM } from '@/services/error';
import { retagSvcClient } from '@/services/retag';
import { KBDevboxReleaseType, KBDevboxTypeV2 } from '@/types/k8s';
import { getRegionUid } from '@/utils/env';
import { createTemplateRepositorySchema } from '@/utils/validate';
import { NextRequest } from 'next/server';
import { z } from 'zod';
// 不带 templateRepositoryUid 就是 create
export async function POST(req: NextRequest) {
  try {
    const headerList = req.headers;
    const queryRaw = await req.json();
    const imageHub = process.env.REGISTRY_ADDR;
    if (!imageHub) {
      console.log('IMAGE_HUB is not set');
      return jsonRes({
        code: 500
      });
    }
    const query = createTemplateRepositorySchema.parse(queryRaw);
    const { kubeConfig, payload, token } = await authSessionWithJWT(headerList);
    const { namespace, k8sCustomObjects } = await getK8s({
      kubeconfig: kubeConfig
    });
    // get devbox release cr !todo
    const { body: releaseBody } = (await k8sCustomObjects.getNamespacedCustomObject(
      'devbox.sealos.io',
      'v1alpha1',
      namespace,
      'devboxreleases',
      query.devboxReleaseName
    )) as { body: KBDevboxReleaseType };
    const devboxName = releaseBody.metadata.ownerReferences.find(
      (item) => item.apiVersion === 'devbox.sealos.io/v1alpha1'
    )?.name;
    if (!devboxName) {
      return jsonRes({
        code: 409,
        error: 'devboxName not found'
      });
    }
    const { body: devboxBody } = (await k8sCustomObjects.getNamespacedCustomObject(
      'devbox.sealos.io',
      'v1alpha1',
      namespace,
      'devboxes',
      devboxName
    )) as { body: KBDevboxTypeV2 };

    const devboxReleaseImage = releaseBody.status.originalImage;
    if (!devboxReleaseImage) {
      return jsonRes({
        code: 409,
        error: 'devboxReleaseImage not found'
      });
    }
    const isExist = await devboxDB.templateRepository.findUnique({
      where: {
        isDeleted_regionUid_name: {
          regionUid: getRegionUid(),
          name: query.templateRepositoryName,
          isDeleted: false
        }
      },
      select: {
        uid: true
      }
    });
    if (isExist) {
      return jsonRes({
        code: 409,
        error: 'templateRepository name already exists'
      });
    }
    const organization = await devboxDB.organization.findUnique({
      where: {
        uid: payload.organizationUid,
        isDeleted: false
      }
    });
    if (!organization) {
      throw Error(ERROR_ENUM.unAuthorization);
    }
    const targetImage = `${imageHub}/${organization.id}/${query.templateRepositoryName}:${query.version}`;

    const originalImage = devboxReleaseImage.startsWith(imageHub)
      ? devboxReleaseImage
      : `${imageHub}/${devboxReleaseImage}`;

    const retagbody = {
      original: originalImage,
      target: targetImage
    };
    const retagResult = await retagSvcClient.post('/tag', retagbody, {
      headers: {
        Authorization: token
      }
    });
    if (retagResult.status !== 200) {
      console.log('retagResult', retagResult);
      throw Error('retag failed');
    }
    // invoke retag service !todo
    // suported deleted because devbox instance of deleted template
    const origionalTemplate = await devboxDB.template.findUnique({
      where: {
        uid: devboxBody.spec.templateID
      },
      select: {
        templateRepository: {
          select: {
            iconId: true
          }
        }
      }
    });
    const officialTagList = await devboxDB.tag.findMany({
      where: {
        type: TagType.OFFICIAL_CONTENT
      },
      select: {
        uid: true
      }
    });
    const result = await devboxDB.templateRepository.create({
      data: {
        description: query.description,
        templateRepositoryTags: {
          createMany: {
            data: query.tagUidList
              .filter((item) => !officialTagList.some((tag) => tag.uid === item))
              .map((uid) => ({ tagUid: uid }))
          }
        },
        templates: {
          create: {
            config: JSON.stringify(devboxBody.spec.config),
            image: targetImage,
            name: query.version,
            devboxReleaseImage,
            parentUid: devboxBody.spec.templateID
          }
        },
        regionUid: getRegionUid(),
        organizationUid: payload.organizationUid,
        iconId: origionalTemplate?.templateRepository.iconId,
        kind: TemplateRepositoryKind.CUSTOM,
        name: query.templateRepositoryName,
        isPublic: query.isPublic
      }
    });
    return jsonRes({
      data: {
        success: true
      }
    });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return jsonRes({
        code: 400,
        error: err.message
      });
    }
    if (err instanceof Error && err.message === 'Runtime not found') {
      return jsonRes({
        code: 404,
        error: err.message
      });
    }
    return jsonRes({
      code: 500,
      error: err
    });
  }
}
