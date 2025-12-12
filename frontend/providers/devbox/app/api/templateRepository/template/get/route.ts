import { authSession } from '@/services/backend/auth';
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

    await authSession(headerList);

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
        image: true,
        templateRepository: {
          select: {
            uid: true,
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
      !template.templateRepository.isPublic ||
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
          name: template.name,
          image: template.image,
          templateRepositoryUid: template.templateRepository.uid
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
