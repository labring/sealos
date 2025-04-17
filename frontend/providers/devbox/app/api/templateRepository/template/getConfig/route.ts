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
    const uid = searchParams.get('uid');
    const { payload } = await authSessionWithJWT(headerList);
    if (!uid)
      return jsonRes({
        code: 400,
        error: 'templateUid is required'
      });
    const template = await devboxDB.template.findUnique({
      where: {
        uid
      },
      select: {
        config: true,
        uid: true,
        name: true,
        templateRepository: {
          select: {
            organization: {
              select: {
                uid: true,
                isDeleted: true
              }
            },
            regionUid: true,
            isDeleted: true,
            isPublic: true
          }
        },
        isDeleted: true
      }
    });
    const regionUid = getRegionUid();
    if (
      !template ||
      !(
        template.templateRepository.organization.uid === payload.organizationUid ||
        template.templateRepository.isPublic === true
      ) ||
      template.templateRepository.regionUid !== regionUid
    ) {
      return jsonRes({
        code: 404,
        error: 'Template is not found'
      });
    }
    return jsonRes({
      data: {
        template: {
          config: template.config,
          uid: template.uid,
          name: template.name
        }
      }
    });
  } catch (err: any) {
    return jsonRes({
      code: 500,
      error: err
    });
  }
}
