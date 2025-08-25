import { jsonRes } from '@/services/backend/response';
import { devboxDB } from '@/services/db/init';
import { getRegionUid } from '@/utils/env';
import { NextRequest } from 'next/server';
export const dynamic = 'force-dynamic';

export const GET = async function GET(req: NextRequest) {
  try {
    const organization = await devboxDB.organization.findUnique({
      where: {
        id: 'labring'
      }
    });
    if (!organization) throw Error('organization not found');
    const regionUid = getRegionUid();
    const templateRepositoryList = await devboxDB.templateRepository.findMany({
      where: {
        isPublic: true,
        isDeleted: false,
        organizationUid: organization.uid,
        regionUid
      },
      select: {
        kind: true,
        iconId: true,
        name: true,
        uid: true,
        description: true,
        templateRepositoryTags: {
          select: {
            tag: true
          }
        }
      }
    });
    return jsonRes({
      data: {
        templateRepositoryList
      }
    });
  } catch (err: any) {
    return jsonRes({
      code: 500,
      error: err
    });
  }
};
