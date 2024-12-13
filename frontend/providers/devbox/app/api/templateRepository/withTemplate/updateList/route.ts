import { authSessionWithJWT } from "@/services/backend/auth"
import { jsonRes } from "@/services/backend/response"
import { devboxDB } from "@/services/db/init"
import { updateTemplateListSchema } from "@/utils/vaildate"
import { NextRequest } from "next/server"
import { z } from "zod"
export async function POST(req: NextRequest) {
  try {
    const headerList = req.headers
    const queryRaw = await req.json()
    const imageHub = process.env.REGISTRY_ADDR
    if (!imageHub) {
      console.log("IMAGE_HUB is not set")
      return jsonRes({
        code: 500,
      })
    }
    const query = updateTemplateListSchema.parse(queryRaw)
    const { kubeConfig, payload, token } = await authSessionWithJWT(headerList)
    const templateRepository = await devboxDB.templateRepository.findUnique({
      where: {
        uid: query.uid,
        organizationUid: payload.organizationUid,
        isDeleted: false
      },
      select: {
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
    const originalVersionList = templateRepository.templates
    const deletedVersionList = originalVersionList
      .filter((item) =>!query.versionList.includes(item.uid))
      .map((item) => item.uid)
    await devboxDB.$transaction(async tx => {
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