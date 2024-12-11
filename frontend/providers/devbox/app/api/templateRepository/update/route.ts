import { authSessionWithJWT } from "@/services/backend/auth"
import { jsonRes } from "@/services/backend/response"
import { devboxDB } from "@/services/db/init"
import { updateTemplateRepositorySchema } from "@/utils/vaildate"
import { NextRequest } from "next/server"
import { z } from "zod"
export async function POST(req: NextRequest) {
  try {
    const headerList = req.headers
    const { searchParams } = req.nextUrl
    const queryRaw = await req.json()
    const imageHub = process.env.REGISTRY_ADDR
    if (!imageHub) {
      console.log("IMAGE_HUB is not set")
      return jsonRes({
        code: 500,
      })
    }
    const query = updateTemplateRepositorySchema.parse(queryRaw)
    const { kubeConfig, payload, token } = await authSessionWithJWT(headerList)
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
            name: true,
          }
        }
      }
    })
    if (!templateRepository) {
      return jsonRes({
        code: 404,
        error: 'template repository not found'
      })
    }
    const officialTag = await devboxDB.tag.findFirst({
      where: {
        name: 'official'
      }
    })
    const originalTaglist = templateRepository.templateRepositoryTags
    const deletedTagList = originalTaglist
      .filter((item) => !query.tagUidList.includes(item.tagUid))
      .map((item) => item.tagUid)
    const createdTagList = query.tagUidList
      .filter((item) =>
        !originalTaglist.some((tag) => tag.tagUid === item)
        && item !== officialTag?.uid
      )
    const originalVersionList = templateRepository.templates
    const deletedVersionList = originalVersionList
      .filter((item) =>!query.versionList.includes(item.uid))
      .map((item) => item.uid)
    const isExist = await devboxDB.templateRepository.findUnique({
      where: {
        isDeleted_name: {
          name: query.templateRepositoryName,
          isDeleted: false,
        }
      }
    })
    if (isExist && isExist.uid !== query.uid) {
      return jsonRes({
        code: 409,
        error: 'template repository name already exists'
      })
    }
    await devboxDB.$transaction(async tx => {
      await tx.templateRepository.update({
        where: {
          organizationUid: payload.organizationUid,
          uid: query.uid,
        },
        data: {
          description: query.description,
          name: query.templateRepositoryName,
          isPublic: query.isPublic
        }
      })
      for (const uid of deletedVersionList) {
        await tx.template.update({
          where: {
            uid: uid,
            templateRepositoryUid: query.uid,
            isDeleted: false
          },
          data: {
            deletedAt: new Date(),
            isDeleted: null
          }
        })
      }
      await tx.templateRepositoryTag.deleteMany({
        where: {
          templateRepositoryUid: query.uid,
          tagUid: {
            in: deletedTagList
          }
        },
      })
      await tx.templateRepositoryTag.createMany({
        data: createdTagList.map((tagUid) => ({
          tagUid,
          templateRepositoryUid: query.uid
        }))
      })
    })
    return jsonRes({
      data: {
        success: true,
      }
    })
  } catch (err: any) {

    if (err instanceof z.ZodError) {
      return jsonRes({
        code: 400,
        error: err.message
      })
    }
    return jsonRes({
      code: 500,
      error: err
    })
  }
}