import { jsonRes } from '@/services/backend/response';
import { devboxDB } from '@/services/db/init';
import { getRegionUid } from '@/utils/env';
import { NextRequest } from 'next/server';
export const dynamic = 'force-dynamic';

export const GET = async function GET(req: NextRequest) {
  try {
    const regionUid = getRegionUid();
    const templateRepositoryList = await devboxDB.templateRepository.findMany({
      where: {
        isPublic: true,
        isDeleted: false,
        regionUid,
        // Filter by OFFICIAL_CONTENT tag type
        templateRepositoryTags: {
          some: {
            tag: {
              type: 'OFFICIAL_CONTENT'
            }
          }
        }
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
