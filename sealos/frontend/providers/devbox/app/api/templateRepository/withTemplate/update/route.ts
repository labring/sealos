import { TagType } from '@/prisma/generated/client';
import { authSessionWithJWT } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
import { jsonRes } from '@/services/backend/response';
import { devboxDB } from '@/services/db/init';
import { ERROR_ENUM } from '@/services/error';
import { retagSvcClient } from '@/services/retag';
import { KBDevboxReleaseType, KBDevboxTypeV2 } from '@/types/k8s';
import { getRegionUid } from '@/utils/env';
import { updateTemplateSchema } from '@/utils/validate';
import { NextRequest } from 'next/server';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const headerList = req.headers;
    const queryRaw = await req.json();
    const imageHub = process.env.REGISTRY_ADDR;
    if (!imageHub) {
      console.log('REGISTRY_ADDR is not set');
      return jsonRes({
        code: 500
      });
    }
    const query = updateTemplateSchema.parse(queryRaw);
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
    const organization = await devboxDB.organization.findUnique({
      where: {
        uid: payload.organizationUid,
        isDeleted: false
      },
      select: {
        uid: true,
        id: true
      }
    });
    if (!organization) {
      throw Error(ERROR_ENUM.unAuthorization);
    }
    const templateRepository = await devboxDB.templateRepository.findUnique({
      where: {
        isDeleted: false,
        uid: query.templateRepositoryUid,
        regionUid: getRegionUid(),
        organizationUid: payload.organizationUid
      },
      select: {
        uid: true,
        name: true,
        templateRepositoryTags: {
          select: {
            tagUid: true
          }
        },
        templates: true
      }
    });
    if (!templateRepository) {
      return jsonRes({
        code: 409,
        error: 'templateRepository not found'
      });
    }
    const tagretImage = `${imageHub}/${organization.id}/${templateRepository.name}:${query.version}`;
    const originalImage = devboxReleaseImage.startsWith(imageHub)
      ? devboxReleaseImage
      : `${imageHub}/${devboxReleaseImage}`;

    const retagbody = {
      original: originalImage,
      target: tagretImage
    };
    const retagResult = await retagSvcClient.post('/tag', retagbody, {
      headers: {
        Authorization: token
      }
    });
    if (retagResult.status !== 200) {
      throw Error('retag failed');
    }
    const officialTagList = await devboxDB.tag.findMany({
      where: {
        type: TagType.OFFICIAL_CONTENT
      },
      select: {
        uid: true
      }
    });
    const originalTaglist = templateRepository.templateRepositoryTags;
    const deletedTagList = originalTaglist
      .filter((item) => !query.tagUidList.includes(item.tagUid))
      .map((item) => item.tagUid);
    const createdTagList = query.tagUidList.filter(
      (item) =>
        !originalTaglist.some((tag) => tag.tagUid === item) &&
        !officialTagList.some((tag) => tag.uid === item)
    );
    const origionalTemplate = templateRepository.templates.find(
      (item) => item.name === query.version && item.isDeleted === false
    );

    // invoke retag service
    const result = await devboxDB.$transaction(async (tx) => {
      await tx.templateRepository.update({
        where: {
          organizationUid: organization.uid,
          regionUid: getRegionUid(),
          uid: templateRepository.uid
        },
        data: {
          description: query.description
        }
      });
      await tx.templateRepositoryTag.deleteMany({
        where: {
          templateRepositoryUid: query.templateRepositoryUid,
          tagUid: {
            in: deletedTagList
          }
        }
      });
      await tx.templateRepositoryTag.createMany({
        data: createdTagList.map((tagUid) => ({
          tagUid,
          templateRepositoryUid: query.templateRepositoryUid
        }))
      });
      const createTemplate = () =>
        tx.template.create({
          data: {
            name: query.version,
            image: tagretImage,
            devboxReleaseImage: originalImage,
            config: JSON.stringify(devboxBody.spec.config),
            templateRepositoryUid: query.templateRepositoryUid,
            parentUid: origionalTemplate?.uid
          }
        });
      if (!origionalTemplate) {
        await createTemplate();
      } else {
        await tx.template.update({
          where: {
            uid: origionalTemplate.uid,
            isDeleted: false
          },
          data: {
            deletedAt: new Date(),
            isDeleted: null
          }
        });
        await createTemplate();
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
