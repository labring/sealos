import { authSessionWithJWT } from '@/services/backend/auth';
import { jsonRes } from '@/services/backend/response';
import { devboxDB } from '@/services/db/init';
import { getRegionUid } from '@/utils/env';
import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const headerList = req.headers;
    const searchParams = req.nextUrl.searchParams;
    const uid = searchParams.get('templateRepositoryUid');
    const { payload } = await authSessionWithJWT(headerList);
    if (!uid)
      return jsonRes({
        code: 400,
        error: 'templateRepositoryUid is required'
      });
    const templateRepository = await devboxDB.templateRepository.findUnique({
      where: {
        uid,
        isDeleted: false,
        regionUid: getRegionUid()
      },
      select: {
        name: true,
        uid: true,
        organization: {
          select: {
            uid: true,
            isDeleted: true
          }
        },
        isPublic: true,
        templates: {
          where: {
            isDeleted: false
          },
          select: {
            uid: true,
            name: true,
            config: true,
            image: true,
            createdAt: true,
            updatedAt: true
          }
        }
      }
    });

    if (!templateRepository) {
      return jsonRes({
        data: {
          templateList: []
        }
      });
    }
    const templateList = templateRepository.templates;
    if (
      !(
        (templateRepository.organization.isDeleted === false &&
          templateRepository.organization.uid === payload.organizationUid) ||
        templateRepository.isPublic === true
      )
    ) {
      return jsonRes({
        data: {
          templateList
        }
      });
    }
    return jsonRes({
      data: {
        templateList
      }
    });
  } catch (err: any) {
    return jsonRes({
      code: 500,
      error: err
    });
  }
}
