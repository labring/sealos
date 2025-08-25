import { authSessionWithJWT } from '@/services/backend/auth';
import { jsonRes } from '@/services/backend/response';
import { devboxDB } from '@/services/db/init';
import { NextRequest } from 'next/server';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

export async function DELETE(req: NextRequest) {
  try {
    const headerList = req.headers;
    const { searchParams } = req.nextUrl;
    const idRaw = searchParams.get('uid') as string;
    const result = z.string().uuid().safeParse(idRaw);
    const { payload } = await authSessionWithJWT(headerList);
    if (!result.success) {
      return jsonRes({
        code: 400,
        error: 'Invalid versionUid'
      });
    }
    const uid = result.data;
    const template = await devboxDB.template.findUnique({
      where: {
        uid,
        isDeleted: false
      },
      select: {
        templateRepository: {
          select: {
            organization: {
              select: {
                uid: true,
                isDeleted: true
              }
            }
          }
        }
      }
    });
    if (
      !template ||
      !(
        template.templateRepository.organization.uid === payload.organizationUid &&
        template.templateRepository.organization.isDeleted === false
      )
    ) {
      return jsonRes({
        code: 404,
        error: 'template not found'
      });
    }
    const deletedAt = new Date();
    await devboxDB.template.update({
      where: {
        uid,
        isDeleted: false
      },
      data: {
        deletedAt,
        isDeleted: null
      }
    });
    return jsonRes({
      data: {
        isDeleted: true
      }
    });
  } catch (err: any) {
    return jsonRes({
      code: 500,
      error: err
    });
  }
}
