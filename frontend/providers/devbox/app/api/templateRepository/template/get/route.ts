import { authSessionWithJWT } from '@/services/backend/auth'
import { jsonRes } from '@/services/backend/response'
import { devboxDB } from '@/services/db/init'
import { produce } from 'immer'
import { NextRequest } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const headerList = req.headers
    const searchParams = req.nextUrl.searchParams
    const uid = searchParams.get('templateUid')
    const { kubeConfig, payload } = await authSessionWithJWT(headerList)
    if (!uid) return jsonRes({
      code: 400,
      error: 'templateUid is required'
    })
    // const user = await devboxDB.user.findUnique({
    //   where: {
    //     isDeleted_regionUid_namespaceId:{
    //       isDeleted: false,
    //       namespaceId: payload.workspaceId,
    //       regionUid: process.env.REGION_UID!
    //     }
    //   },
    //   select: {
    //     userOrganizations: {
    //       select: {
    //         organizationUid: true,
    //       }
    //     }
    //   }
    // })
    // if (!user) {
    //   throw new Error(ERROR_ENUM.unAuthorization)
    // }
    const template = await devboxDB.template.findUnique({
      where: {
        uid,
        isDeleted: false,
      },
      select: {
        config: true,
        uid: true,
        name: true
      }
    })
    if (!template) {
      return jsonRes({
        code: 404,
        error: 'Template is not found'
      })
    }
    return jsonRes({
      data: {
        template: produce(template, draft => {
          draft.config = JSON.parse(draft.config)
          return draft
        })
      }
    })
  } catch (err: any) {
    return jsonRes({
      code: 500,
      error: err
    })
  }
}