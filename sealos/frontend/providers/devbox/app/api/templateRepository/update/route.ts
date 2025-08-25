import { TagType } from '@/prisma/generated/client';
import { authSessionWithJWT } from '@/services/backend/auth';
import { jsonRes } from '@/services/backend/response';
import { devboxDB } from '@/services/db/init';
import { getRegionUid } from '@/utils/env';
import { updateTemplateRepositorySchema } from '@/utils/validate';
import { NextRequest } from 'next/server';
import { z } from 'zod';
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
    const query = updateTemplateRepositorySchema.parse(queryRaw);
    const { payload } = await authSessionWithJWT(headerList);
    const templateRepository = await devboxDB.templateRepository.findUnique({
      where: {
        uid: query.uid,
        organizationUid: payload.organizationUid,
        isDeleted: false
      },
      select: {
        templateRepositoryTags: {
          select: {
            tagUid: true
          }
        },
        templates: {
          where: {
            isDeleted: false
          },
          select: {
            uid: true,
            name: true
          }
        }
      }
    });
    if (!templateRepository) {
      return jsonRes({
        code: 404,
        error: 'template repository not found'
      });
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
    const isExist = await devboxDB.templateRepository.findUnique({
      where: {
        isDeleted_regionUid_name: {
          regionUid: getRegionUid(),
          name: query.templateRepositoryName,
          isDeleted: false
        }
      }
    });
    if (isExist && isExist.uid !== query.uid) {
      return jsonRes({
        code: 409,
        error: 'template repository name already exists'
      });
    }
    await devboxDB.$transaction(async (tx) => {
      await tx.templateRepository.update({
        where: {
          organizationUid: payload.organizationUid,
          uid: query.uid
        },
        data: {
          description: query.description,
          name: query.templateRepositoryName,
          isPublic: query.isPublic
        }
      });
      await tx.templateRepositoryTag.deleteMany({
        where: {
          templateRepositoryUid: query.uid,
          tagUid: {
            in: deletedTagList
          }
        }
      });
      await tx.templateRepositoryTag.createMany({
        data: createdTagList.map((tagUid) => ({
          tagUid,
          templateRepositoryUid: query.uid
        }))
      });
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
    return jsonRes({
      code: 500,
      error: err
    });
  }
}
