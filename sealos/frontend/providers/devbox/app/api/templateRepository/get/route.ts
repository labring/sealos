import { authSessionWithJWT } from '@/services/backend/auth';
import { jsonRes } from '@/services/backend/response';
import { devboxDB } from '@/services/db/init';
import { getRegionUid } from '@/utils/env';
import { NextRequest } from 'next/server';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const headerList = req.headers;
    const { payload } = await authSessionWithJWT(headerList);
    const _uid = req.nextUrl.searchParams.get('uid');
    const uidResult = z.string().uuid().safeParse(_uid);
    if (!uidResult.success) {
      return jsonRes({
        code: 400,
        error: 'Invalid uid'
      });
    }
    const uid = uidResult.data;
    const regionUid = getRegionUid();
    const templateRepository = await devboxDB.templateRepository.findUnique({
      where: {
        uid,
        isDeleted: false,
        regionUid
      },
      select: {
        templates: {
          where: {
            isDeleted: false
          },
          select: {
            name: true,
            uid: true
          }
        },
        name: true,
        description: true,
        uid: true,
        isPublic: true,
        iconId: true,
        // organizationUid: true,
        organization: {
          select: {
            uid: true,
            isDeleted: true
          }
        },
        templateRepositoryTags: {
          select: {
            tag: true
          }
        }
      }
    });
    if (
      !templateRepository ||
      (!templateRepository.isPublic &&
        templateRepository.organization.isDeleted === false &&
        templateRepository.organization.uid !== payload.organizationUid)
    ) {
      return jsonRes({
        code: 404,
        error: 'Template not found'
      });
    }
    return jsonRes({
      data: {
        templateRepository
      }
    });
  } catch (err: any) {
    return jsonRes({
      code: 500,
      error: err
    });
  }
}
