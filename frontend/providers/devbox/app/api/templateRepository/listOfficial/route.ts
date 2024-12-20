import { jsonRes } from '@/services/backend/response'
import { devboxDB } from '@/services/db/init'
import { NextRequest } from 'next/server'
export const dynamic = 'force-dynamic'

export const GET = async function GET(req: NextRequest) {
  try {
    const organization = await devboxDB.organization.findUnique({
      where: {
        id: 'labring'
      }
    })
    if(!organization) throw Error('organization not found')
    const templateRepositoryList = await devboxDB.templateRepository.findMany({
      where: {
        isPublic: true,
        isDeleted: false,
        organizationUid: organization.uid
      },
      select: {
        kind: true,
        iconId: true,
        name: true,
        uid: true,
        description: true,
      },
    })
    return jsonRes({
      data: {
        templateRepositoryList
      }
    })
  } catch (err: any) {
    return jsonRes({
      code: 500,
      error: err
    })
  }
}